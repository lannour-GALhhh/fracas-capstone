"""Intersect a flood-susceptibility layer with barangay boundaries into BarangaySusceptibility rows."""

from pathlib import Path
from typing import Callable

from django.contrib.gis.db.models.functions import Intersection
from django.contrib.gis.gdal import DataSource
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.db import transaction

from barangays.constants import SusceptibilityLevel, UTM_51N
from barangays.geometry import rebuild_simplified_geometry
from barangays.models import Barangay, BarangaySusceptibility

MIN_AREA_SQM = 1.0  # drop boundary-touching slivers left over from the intersection
REQUIRED_FIELDS = ("susc_level", "Flood")


class SusceptibilityImportError(ValueError):
    pass


def normalize_level(raw: str) -> str | None:
    key = raw.strip().lower().replace(" ", "_")
    return key if key in SusceptibilityLevel.values else None


def to_multipolygon(geom):
    """Coerce an Intersection() result down to a MultiPolygon, or None."""
    if geom is None or geom.empty:
        return None
    if geom.geom_type == "MultiPolygon":
        return geom
    if geom.geom_type == "Polygon":
        return MultiPolygon(geom)
    if geom.geom_type == "GeometryCollection":
        polys = []
        for part in geom:
            if part.geom_type == "Polygon":
                polys.append(part)
            elif part.geom_type == "MultiPolygon":
                polys.extend(part)
        return MultiPolygon(polys) if polys else None
    return None


def import_susceptibility(
    path: Path, tolerance_m: float = 10.0, log: Callable[[str], None] = lambda _msg: None
) -> dict:
    """Replace all BarangaySusceptibility rows from `path`. Requires barangays to be loaded first."""
    if not Barangay.objects.exists():
        raise SusceptibilityImportError("Import barangay boundaries before the susceptibility layer.")

    layer = DataSource(str(path))[0]
    missing = [f for f in REQUIRED_FIELDS if f not in layer.fields]
    if missing:
        raise SusceptibilityImportError(f"Layer is missing required field(s): {', '.join(missing)}.")
    source_srid = layer.srs.srid if layer.srs and layer.srs.srid else UTM_51N

    rows = []
    skipped_slivers = 0
    invalid_fixed = 0
    unmatched_levels = []

    for feature in layer:
        raw_level = feature.get("susc_level")
        level = normalize_level(raw_level)
        if level is None:
            unmatched_levels.append(raw_level)
            continue
        source_flood_value = feature.get("Flood")

        class_geom = GEOSGeometry(feature.geom.wkt, srid=source_srid)
        if not class_geom.valid:
            try:
                class_geom = class_geom.make_valid()
            except Exception:
                class_geom = class_geom.buffer(0)
            invalid_fixed += 1
        class_geom_4326 = class_geom.transform(4326, clone=True)

        log(f"Intersecting {level} (source Flood={source_flood_value}) against barangays...")
        candidates = Barangay.objects.filter(
            boundary__intersects=class_geom_4326
        ).annotate(zone=Intersection("boundary", class_geom_4326))

        level_rows = 0
        for barangay in candidates:
            mp = to_multipolygon(barangay.zone)
            if mp is None:
                continue
            mp.srid = 4326
            zone_utm = mp.transform(UTM_51N, clone=True)
            area_sqm = zone_utm.area
            if area_sqm < MIN_AREA_SQM:
                skipped_slivers += 1
                continue

            simplified_utm = zone_utm.simplify(tolerance_m, preserve_topology=True)
            if simplified_utm.geom_type == "Polygon":
                simplified_utm = MultiPolygon(simplified_utm)
                simplified_utm.srid = UTM_51N
            geom_simplified = simplified_utm.transform(4326, clone=True)

            rows.append(
                BarangaySusceptibility(
                    barangay=barangay,
                    level=level,
                    geom=mp,
                    geom_simplified=geom_simplified,
                    area_sqm=area_sqm,
                    source_flood_value=source_flood_value,
                )
            )
            level_rows += 1
        log(f"  -> {level_rows} barangay row(s).")

    if unmatched_levels:
        raise SusceptibilityImportError(f"Unrecognized susc_level value(s): {set(unmatched_levels)}")
    if not rows:
        raise SusceptibilityImportError("The layer doesn't overlap any imported barangay.")

    with transaction.atomic():
        deleted, _ = BarangaySusceptibility.objects.all().delete()
        BarangaySusceptibility.objects.bulk_create(rows)
        rebuilt = rebuild_simplified_geometry()

    return {
        "loaded": len(rows),
        "replaced": deleted,
        "skipped_slivers": skipped_slivers,
        "made_valid": invalid_fixed,
        "rebuilt": rebuilt,
    }
