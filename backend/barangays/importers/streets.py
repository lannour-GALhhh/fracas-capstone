"""Detect named streets crossing high / very-high flood-susceptibility zones (OpenStreetMap via Overpass)."""

from typing import Callable

import requests
from django.contrib.gis.geos import LineString
from django.db import transaction

from barangays.constants import SUSCEPTIBILITY_VALUES, SusceptibilityLevel
from barangays.models import BarangaySusceptibility, Street

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HIGH_RISK_LEVELS = (SusceptibilityLevel.HIGH, SusceptibilityLevel.VERY_HIGH)
REQUEST_TIMEOUT_S = 180
# Overpass requires an identifying User-Agent or it 406s.
REQUEST_HEADERS = {"User-Agent": "FRACAS-FloodEarlyWarning/1.0 (Zamboanga City; github.com/GetALifehahaha/FRACAS)"}


class StreetDetectionError(ValueError):
    pass


def fetch_named_ways(south: float, west: float, north: float, east: float) -> list[dict]:
    """Named highway ways in the bbox, each with its node geometry."""
    query = f'[out:json][timeout:{REQUEST_TIMEOUT_S}];way["highway"]["name"]({south},{west},{north},{east});out tags geom;'
    try:
        response = requests.post(
            OVERPASS_URL, data={"data": query}, headers=REQUEST_HEADERS, timeout=REQUEST_TIMEOUT_S
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise StreetDetectionError(f"Overpass request failed: {exc}") from exc
    return response.json().get("elements", [])


def _line(element: dict) -> LineString | None:
    points = [(p["lon"], p["lat"]) for p in element.get("geometry") or []]
    return LineString(points, srid=4326) if len(points) >= 2 else None


def detect_high_risk_streets(fetch: Callable[..., list[dict]] | None = None) -> dict:
    """Replace all Street rows with the named streets that cross a high/very_high zone.

    A street is saved once per barangay it crosses a risky zone in, at the worst level met there.
    """
    zones = BarangaySusceptibility.objects.filter(level__in=HIGH_RISK_LEVELS)
    if not zones.exists():
        raise StreetDetectionError("No high or very high flood zones found — import the susceptibility layer first.")

    extents = [z.geom_simplified.extent for z in zones.only("geom_simplified")]
    south, west = min(e[1] for e in extents), min(e[0] for e in extents)
    north, east = max(e[3] for e in extents), max(e[2] for e in extents)
    elements = (fetch or fetch_named_ways)(south, west, north, east)

    found: dict[tuple[int, str], str] = {}  # (barangay_id, street name) -> worst level
    for element in elements:
        name = (element.get("tags") or {}).get("name")
        line = _line(element)
        if not name or line is None:
            continue
        for barangay_id, level in zones.filter(geom_simplified__intersects=line).values_list("barangay_id", "level"):
            key = (barangay_id, name)
            if key not in found or SUSCEPTIBILITY_VALUES[level] > SUSCEPTIBILITY_VALUES[found[key]]:
                found[key] = level

    with transaction.atomic():
        replaced, _ = Street.objects.all().delete()
        Street.objects.bulk_create(
            Street(name=name, barangay_id=bid, susceptibility_level=level) for (bid, name), level in found.items()
        )
    return {"streets": len(found), "barangays": len({bid for bid, _ in found}), "replaced": replaced}
