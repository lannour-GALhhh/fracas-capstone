"""Helpers for writing to the unified POI audit log."""

from .models import MapPoiChange, PoiType


def log_poi_change(*, editor, poi_type: str, poi_id: int, name: str, action: str, location=None, detail=None):
    """Append a MapPoiChange row. `location` is an optional GEOS Point (lng/lat)."""
    longitude = latitude = None
    if location is not None:
        longitude, latitude = location.x, location.y
    return MapPoiChange.objects.create(
        editor=editor if getattr(editor, "is_authenticated", False) else None,
        poi_type=poi_type,
        poi_id=poi_id,
        name=name,
        action=action,
        longitude=longitude,
        latitude=latitude,
        detail=detail or {},
    )


__all__ = ["log_poi_change", "PoiType"]
