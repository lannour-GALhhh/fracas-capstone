"""Hindcasting for model validation.

Reconstructs a barangay's rainfall at a past moment from Open-Meteo's archive
API and scores it through the *same* engine used in production, so we can
compare predictions against recorded flood events. Susceptibility is static
reference data (not a live feed), so — unlike the old dam factor — it's
available for every hindcast once loaded; only rainfall varies over time.

The archive HTTP call is injectable (`fetcher`) so tests run offline.
"""

from __future__ import annotations

from datetime import timedelta
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import requests

from .engine import RiskEngine, ScoredResult
from .factors import FactorInput

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
TIMEOUT_SECONDS = 15
MANILA = ZoneInfo("Asia/Manila")


class HindcastError(Exception):
    """Raised when archive data can't be fetched or aligned to the event time."""


def fetch_archive(latitude: float, longitude: float, when) -> dict:
    start = (when - timedelta(days=1)).date().isoformat()
    end = when.date().isoformat()
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start,
        "end_date": end,
        "hourly": "precipitation",
        "timezone": "Asia/Manila",
    }
    try:
        response = requests.get(ARCHIVE_URL, params=params, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HindcastError(f"Archive request failed: {exc}") from exc
    return response.json()


def reconstruct_rainfall(data: dict, when) -> SimpleNamespace:
    times = data.get("hourly", {}).get("time", [])
    precip = data.get("hourly", {}).get("precipitation", [])
    target_hour = when.strftime("%Y-%m-%dT%H")
    index = next((i for i, t in enumerate(times) if t.startswith(target_hour)), None)
    if index is None:
        raise HindcastError(f"Event hour {target_hour} not in archive data.")

    def at(i: int) -> float:
        return precip[i] if 0 <= i < len(precip) and precip[i] is not None else 0.0

    return SimpleNamespace(
        current_rainfall_strength=at(index),
        forecast_strength_1hr=at(index + 1),
        forecast_strength_2hr=at(index + 2),
        forecast_strength_3hr=at(index + 3),
        forecast_strength_4hr=at(index + 4),
        accumulated_24hr=round(sum(at(i) for i in range(index - 23, index + 1)), 2),
    )


def hindcast_score(barangay, when, susceptibility_by_barangay, *, fetcher=None) -> ScoredResult:
    # Late-bind the default so tests can patch fetch_archive at the module level.
    fetch = fetcher or fetch_archive
    # Match the archive's Asia/Manila local hours (avoids UTC-vs-local drift).
    if when.tzinfo is not None:
        when = when.astimezone(MANILA)
    centroid = barangay.boundary.centroid
    data = fetch(centroid.y, centroid.x, when)
    rainfall = reconstruct_rainfall(data, when)
    context = SimpleNamespace(
        susceptibility_for=lambda b: susceptibility_by_barangay.get(b.id)
    )
    engine = RiskEngine.from_active_config()
    return engine.score(FactorInput(barangay, rainfall, context))
