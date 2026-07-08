"""Load flood-susceptibility zones from the authoritative ZCDRRMO/DOST/PAGASA
(Manila Observatory) hazard-classification shapefile, intersected against
barangay boundaries.

The shapefile has exactly 5 features — one MultiPolygon per ordinal
`susc_level` class, covering all disjoint areas of that class citywide (not
pre-split per barangay). This command intersects each class against every
barangay boundary, storing one row per non-trivial Barangay x
SusceptibilityLevel pair (bounded at <=101 barangays x 5 levels = <=505 rows).

Full delete+recreate each run, wrapped in a single transaction — bounded row
count makes this simpler and safer than diffing.

    python manage.py load_flood_susceptibility
    python manage.py load_flood_susceptibility --shapefile /path/to/ZAM_FLOOD.shp --simplify-tolerance-m 10
"""

from pathlib import Path

from django.conf import settings
from django.contrib.gis.db.models.functions import Intersection
from django.contrib.gis.gdal import DataSource
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from barangays.constants import SusceptibilityLevel, UTM_51N
from barangays.models import Barangay, BarangaySusceptibility

DEFAULT_SHAPEFILE = Path(settings.BASE_DIR) / "zbga-city-flood-shapefile" / "ZAM_FLOOD.shp"
MIN_AREA_SQM = 1.0  # drop boundary-touching slivers left over from the intersection


def _normalize_level(raw: str) -> str | None:
    key = raw.strip().lower().replace(" ", "_")
    return key if key in SusceptibilityLevel.values else None


def _to_multipolygon(geom):
    """Coerce an Intersection() result down to a MultiPolygon, or None if
    nothing polygonal survived (boundary-touching edges intersect as bare
    points/lines, which GeometryCollection results can carry alongside area)."""
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


class Command(BaseCommand):
    help = "Load BarangaySusceptibility rows from the ZAM_FLOOD hazard shapefile."

    def add_arguments(self, parser):
        parser.add_argument("--shapefile", default=str(DEFAULT_SHAPEFILE))
        parser.add_argument("--simplify-tolerance-m", type=float, default=10.0)

    def handle(self, *args, **options):
        shapefile = Path(options["shapefile"])
        if not shapefile.exists():
            raise CommandError(f"Shapefile not found: {shapefile}")
        tolerance_m = options["simplify_tolerance_m"]

        layer = DataSource(str(shapefile))[0]

        rows = []
        skipped_slivers = 0
        invalid_fixed = 0
        unmatched_levels = []

        for feature in layer:
            raw_level = feature.get("susc_level")
            level = _normalize_level(raw_level)
            if level is None:
                unmatched_levels.append(raw_level)
                continue
            source_flood_value = feature.get("Flood")

            class_geom = GEOSGeometry(feature.geom.wkt, srid=32651)
            if not class_geom.valid:
                try:
                    class_geom = class_geom.make_valid()
                except Exception:
                    class_geom = class_geom.buffer(0)
                invalid_fixed += 1
            class_geom_4326 = class_geom.transform(4326, clone=True)

            self.stdout.write(
                f"Intersecting {level} (source Flood={source_flood_value}) against barangays..."
            )
            candidates = Barangay.objects.filter(
                boundary__intersects=class_geom_4326
            ).annotate(zone=Intersection("boundary", class_geom_4326))

            level_rows = 0
            for barangay in candidates:
                mp = _to_multipolygon(barangay.zone)
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
            self.stdout.write(f"  -> {level_rows} barangay row(s).")

        if unmatched_levels:
            raise CommandError(f"Unrecognized susc_level value(s) in shapefile: {set(unmatched_levels)}")

        with transaction.atomic():
            deleted, _ = BarangaySusceptibility.objects.all().delete()
            BarangaySusceptibility.objects.bulk_create(rows)

        self.stdout.write(
            self.style.SUCCESS(
                f"Loaded {len(rows)} BarangaySusceptibility row(s) (replaced {deleted} existing). "
                f"Skipped {skipped_slivers} sliver(s) < {MIN_AREA_SQM}m^2. "
                f"{invalid_fixed} source class(es) needed make_valid()."
            )
        )
