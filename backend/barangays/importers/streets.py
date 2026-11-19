"""Detect named streets crossing high / very-high flood-susceptibility zones (OpenStreetMap via Overpass)."""

import time
from typing import Callable

import requests
from django.contrib.gis.geos import LineString
from django.db import transaction

from barangays.constants import SUSCEPTIBILITY_VALUES, SusceptibilityLevel
from barangays.models import BarangaySusceptibility, Street

OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)
OVERPASS_URL = OVERPASS_URLS[0]
RETRY_STATUSES = (429, 502, 503, 504)
ROUNDS = 2  # passes over the mirror list
RETRY_BACKOFF_S = 5
HIGH_RISK_LEVELS = (SusceptibilityLevel.HIGH, SusceptibilityLevel.VERY_HIGH)
REQUEST_TIMEOUT_S = 180
# Overpass requires an identifying User-Agent or it 406s.
REQUEST_HEADERS = {"User-Agent": "FRACAS-FloodEarlyWarning/1.0 (Zamboanga City; github.com/GetALifehahaha/FRACAS)"}


class StreetDetectionError(ValueError):
    pass


def _post_with_failover(query: str) -> requests.Response:
    """POST to Overpass, rotating mirrors and retrying on transient overload (429/502/503/504, timeouts)."""
    last = "no attempt made"
    for round_ in range(ROUNDS):
        for url in OVERPASS_URLS:
            try:
                response = requests.post(url, data={"data": query}, headers=REQUEST_HEADERS, timeout=REQUEST_TIMEOUT_S)
            except (requests.ConnectionError, requests.Timeout) as exc:
                last = f"{url}: {exc}"
                continue
            if response.status_code in RETRY_STATUSES:
                last = f"{response.status_code} from {url}"
                continue
            try:
                response.raise_for_status()
            except requests.RequestException as exc:
                raise StreetDetectionError(f"Overpass request failed: {exc}") from exc
            return response
        if round_ < ROUNDS - 1:
            time.sleep(RETRY_BACKOFF_S * (round_ + 1))
    raise StreetDetectionError(f"Overpass request failed on all servers (last: {last}). Try again in a few minutes.")


def fetch_named_ways(south: float, west: float, north: float, east: float) -> list[dict]:
    """Named highway ways in the bbox, each with its node geometry."""
    query = f'[out:json][timeout:{REQUEST_TIMEOUT_S}];way["highway"]["name"]({south},{west},{north},{east});out tags geom;'
    response = _post_with_failover(query)
    try:
        payload = response.json()
    except ValueError as exc:
        raise StreetDetectionError(f"Overpass returned a non-JSON response: {response.text[:200]!r}") from exc
    if not payload.get("elements") and payload.get("remark"):
        raise StreetDetectionError(f"Overpass error: {payload['remark']}")
    return payload.get("elements", [])


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

    # Source polygons can be self-intersecting; PostGIS/GEOS raise TopologyException on those, so repair
    # them once up front and test against prepared in-memory geometries instead of querying per street.
    prepared = []
    for barangay_id, level, geom in zones.values_list("barangay_id", "level", "geom_simplified"):
        valid = geom if geom.valid else geom.make_valid()
        prepared.append((barangay_id, level, valid.prepared, valid.extent))
    extents = [ext for *_, ext in prepared]
    south, west = min(e[1] for e in extents), min(e[0] for e in extents)
    north, east = max(e[3] for e in extents), max(e[2] for e in extents)
    elements = (fetch or fetch_named_ways)(south, west, north, east)

    found: dict[tuple[int, str], str] = {}  # (barangay_id, street name) -> worst level
    for element in elements:
        name = (element.get("tags") or {}).get("name")
        line = _line(element)
        if not name or line is None:
            continue
        lx0, ly0, lx1, ly1 = line.extent
        for barangay_id, level, zone, (zx0, zy0, zx1, zy1) in prepared:
            if lx1 < zx0 or lx0 > zx1 or ly1 < zy0 or ly0 > zy1 or not zone.intersects(line):
                continue
            key = (barangay_id, name)
            if key not in found or SUSCEPTIBILITY_VALUES[level] > SUSCEPTIBILITY_VALUES[found[key]]:
                found[key] = level

    with transaction.atomic():
        replaced, _ = Street.objects.all().delete()
        Street.objects.bulk_create(
            Street(name=name, barangay_id=bid, susceptibility_level=level) for (bid, name), level in found.items()
        )
    return {"streets": len(found), "barangays": len({bid for bid, _ in found}), "replaced": replaced}
