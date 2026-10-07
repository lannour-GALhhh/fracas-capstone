"""Import Zamboanga City barangay boundaries from an uploaded vector layer."""

from pathlib import Path

from django.contrib.gis.gdal import DataSource
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon

from barangays.models import Barangay

ZAMBOANGA_CITY_CODE = "PH0907332"
REQUIRED_FIELDS = ("adm4_pcode", "adm4_name")


class BoundaryImportError(ValueError):
    pass


def _as_multipolygon(geom: GEOSGeometry) -> MultiPolygon | None:
    if geom.geom_type == "MultiPolygon":
        return geom
    if geom.geom_type == "Polygon":
        return MultiPolygon(geom)
    if geom.geom_type == "GeometryCollection":
        polys = [g for g in geom if g.geom_type == "Polygon"]
        return MultiPolygon(polys) if polys else None
    return None


def import_boundaries(path: Path, layer_index: int = 0) -> dict:
    """Upsert barangays (keyed on `adm4_pcode`) from `path`. Never deletes: barangays own scores and subscriptions."""
    layer = DataSource(str(path))[layer_index]
    missing = [f for f in REQUIRED_FIELDS if f not in layer.fields]
    if missing:
        raise BoundaryImportError(f"Layer is missing required field(s): {', '.join(missing)}.")
    has_city_field = "adm3_pcode" in layer.fields
    has_area_field = "area_sqkm" in layer.fields

    created = updated = skipped = 0
    for feature in layer:
        if has_city_field and feature.get("adm3_pcode") != ZAMBOANGA_CITY_CODE:
            skipped += 1
            continue
        geom = GEOSGeometry(feature.geom.wkt, srid=(layer.srs.srid if layer.srs and layer.srs.srid else 4326))
        if geom.srid != 4326:
            geom.transform(4326)
        if not geom.valid:
            geom = geom.buffer(0)
        boundary = _as_multipolygon(geom)
        if boundary is None:
            skipped += 1
            continue
        boundary.srid = 4326
        _, was_created = Barangay.objects.update_or_create(
            code=feature.get("adm4_pcode"),
            defaults={
                "name": feature.get("adm4_name"),
                "province_code": ZAMBOANGA_CITY_CODE,
                "area_square_km": feature.get("area_sqkm") if has_area_field else None,
                "boundary": boundary,
            },
        )
        created, updated = (created + 1, updated) if was_created else (created, updated + 1)

    if created + updated == 0:
        raise BoundaryImportError(
            f"No Zamboanga City barangays found (expected adm3_pcode = {ZAMBOANGA_CITY_CODE})."
        )
    return {"created": created, "updated": updated, "skipped": skipped}
