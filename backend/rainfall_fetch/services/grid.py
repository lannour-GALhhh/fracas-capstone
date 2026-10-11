"""Maps barangays to the Open-Meteo grid cell they resolve to, so each cell is fetched once.

Barangays in the same cell get identical weather, so querying one point per cell is the most
dedup Open-Meteo allows. Discovery runs inside the normal fetch (hosts like Render's free tier
have no shell for a one-off command) and only for barangays that are not mapped yet.
"""

import logging
import time

from django.conf import settings
from django.db import transaction

from barangays.models import Barangay
from rainfall_fetch.models import BarangayRainfallGrid, RainfallSettings

from . import budget

logger = logging.getLogger(__name__)


def discovery_url(latitudes: str, longitudes: str, model_param: str = "") -> str:
    # Only the latitude/longitude Open-Meteo echoes back is needed: the centre of the cell it used.
    # The model matters, since each model has its own grid.
    return (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitudes}&longitude={longitudes}&current=precipitation{model_param}"
    )


def reset_grid_mapping() -> None:
    """Forget every mapping; the next fetch rediscovers them. Needed when the model changes."""
    BarangayRainfallGrid.objects.all().delete()


def ensure_grid_mapping(*, remap: bool = False):
    """Map unmapped barangays (all of them with `remap`). Returns (mapped, failed barangays).

    Failures are not fatal: an unmapped barangay is simply fetched at its own centroid until a
    later run maps it."""
    # Imported here: tasks imports this module for the fetch.
    from rainfall_fetch.tasks import CHUNK_DELAY, CHUNK_SIZE, _chunked, _get_with_retry

    barangays = Barangay.objects.all() if remap else Barangay.objects.filter(rainfall_grid__isnull=True)
    barangays = list(barangays)
    model_param = RainfallSettings.cached().model_param
    mapped, failed = 0, []

    chunks = list(_chunked(barangays, CHUNK_SIZE))
    for chunk_num, chunk in enumerate(chunks):
        if not budget.can_spend(len(chunk)):
            logger.error("Open-Meteo daily call limit reached; grid discovery postponed.")
            failed.extend(b for c in chunks[chunk_num:] for b in c)
            break

        centroids = [b.boundary.centroid for b in chunk]
        lats = ",".join(str(c.y) for c in centroids)
        lons = ",".join(str(c.x) for c in centroids)
        try:
            batch = _get_with_retry(discovery_url(lats, lons, model_param)).json()
            if isinstance(batch, dict):
                batch = [batch]
        except Exception as e:  # noqa: BLE001 - logged and skipped; the rest still run
            logger.error(f"Failed to discover grid cells for {len(chunk)} barangays: {e}")
            failed.extend(chunk)
        else:
            with transaction.atomic():
                for barangay, data in zip(chunk, batch):
                    if "latitude" not in data or "longitude" not in data:
                        failed.append(barangay)
                        continue
                    BarangayRainfallGrid.objects.update_or_create(
                        barangay=barangay,
                        defaults={"grid_lat": data["latitude"], "grid_lon": data["longitude"]},
                    )
                    mapped += 1

        if chunk_num < len(chunks) - 1:
            time.sleep(CHUNK_DELAY)

    if mapped:
        cells = BarangayRainfallGrid.objects.values_list("grid_lat", "grid_lon").distinct().count()
        logger.info(f"Mapped {mapped} barangay(s); {cells} unique Open-Meteo grid cell(s) in total.")
    return mapped, failed


def grid_status() -> dict:
    """Dedup picture for the admin console: how many barangays share how many Open-Meteo cells,
    and how today's call usage compares with the cap."""
    cells = BarangayRainfallGrid.objects.values_list("grid_lat", "grid_lon").distinct().count()
    # Barangays still unmapped each cost a call of their own per run.
    unmapped = Barangay.objects.filter(rainfall_grid__isnull=True).count()
    return {
        "barangays": Barangay.objects.count(),
        "mapped": BarangayRainfallGrid.objects.count(),
        "cells": cells,
        "expected_daily_calls": budget.expected_daily_calls(cells + unmapped),
        "calls_today": budget.calls_today(),
        "daily_limit": settings.RAINFALL_DAILY_CALL_LIMIT,
        "has_retry_headroom": budget.has_retry_headroom(cells + unmapped),
    }
