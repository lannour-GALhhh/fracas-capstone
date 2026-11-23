"""On-demand rainfall outlook (now through 11 PM tomorrow) for one barangay — display-only, never scored.

Hours 1-4 ahead are covered by the risk score (the real warning). This returns the full next 24
hours as plain rainfall in PAGASA intensity bands so residents and operators can see what may be
coming; it is a forecast, deliberately not turned into a hazard score or an alert.

Fetched when a barangay is opened (not by the pipeline) and cached per Open-Meteo grid cell, so
barangays sharing a cell and repeat taps cost one call per `CACHE_SECONDS`.
"""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone as dt_timezone

from django.core.cache import cache
from django.utils import timezone

from barangays.models import Barangay
from rainfall_fetch.models import BarangayRainfallGrid, RainfallSettings

from . import budget

END_HOUR = 23  # last forecast hour: the one starting at 11 PM tomorrow (local), as 12 AM begins a new day
MAX_HOURS = 72  # safety cap on the window
WARNING_HOURS = 4  # hours 1-4 are covered by the risk score; beyond is outlook-only
CACHE_SECONDS = 30 * 60  # same cadence as the pipeline's Open-Meteo fetch

# PAGASA rainfall warning bands (mm/hr), lowest first: (lower bound, band).
BANDS = ((30.0, "red"), (15.0, "orange"), (7.5, "yellow"))
HEAVY_MM_HR = BANDS[-1][0]


class ForecastUnavailable(Exception):
    """Open-Meteo could not be reached (or the daily call budget is spent)."""


def band_for(mm_hr: float) -> str:
    for lower, name in BANDS:
        if mm_hr >= lower:
            return name
    return "none"


def forecast_url(lat: float, lon: float, model_param: str = "") -> str:
    return (
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
        f"&hourly=precipitation,precipitation_probability&forecast_days=3&timezone=GMT{model_param}"
    )


def _parse_time(label: str) -> datetime:
    return datetime.strptime(label, "%Y-%m-%dT%H:%M").replace(tzinfo=dt_timezone.utc)


def window_end(now: datetime) -> datetime:
    """11 PM tomorrow in the project's local time (UTC-aware): the start of the last forecast hour."""
    tz = timezone.get_current_timezone()
    tomorrow = now.astimezone(tz).date() + timedelta(days=1)
    return datetime.combine(tomorrow, time(END_HOUR), tzinfo=tz).astimezone(dt_timezone.utc)


def parse_hours(data: dict, now: datetime) -> list[dict]:
    """Every hour after `now` through 11 PM tomorrow (local), each `{start, lead_hours, mm_hr, probability, band}`.

    Open-Meteo labels an hourly total by the hour's *end*, so the interval that starts at `start`
    is read from the label one hour later. Hours the response lacks are skipped, not zero-filled.
    """
    hourly = data.get("hourly") or {}
    times = hourly.get("time") or []
    amounts = hourly.get("precipitation") or []
    chances = hourly.get("precipitation_probability") or []
    index = {label: i for i, label in enumerate(times)}

    top = now.astimezone(dt_timezone.utc).replace(minute=0, second=0, microsecond=0)
    end = window_end(now)
    hours = []
    for lead in range(1, MAX_HOURS + 1):
        start = top + timedelta(hours=lead)
        if start > end:
            break
        i = index.get((start + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M"))
        if i is None or i >= len(amounts):
            continue
        mm = round(float(amounts[i] or 0), 2)
        chance = chances[i] if i < len(chances) else None
        hours.append(
            {
                "start": start.isoformat(),
                "lead_hours": lead,
                "mm_hr": mm,
                "probability": None if chance is None else int(chance),
                "band": band_for(mm),
            }
        )
    return hours


def summarise(hours: list[dict]) -> dict:
    """Heads-up facts over the outlook-only hours (beyond the risk score's 4 h window)."""
    outlook = [h for h in hours if h["lead_hours"] > WARNING_HOURS]
    heavy = next((h for h in outlook if h["mm_hr"] >= HEAVY_MM_HR), None)
    peak = max(hours, key=lambda h: h["mm_hr"], default=None)
    return {
        "first_heavy": heavy,
        "peak": peak if peak and peak["mm_hr"] > 0 else None,
        "total_mm": round(sum(h["mm_hr"] for h in hours), 1),
    }


def _cell_for(barangay: Barangay) -> tuple[float, float]:
    """The barangay's Open-Meteo grid cell, or its centroid when it is not mapped yet."""
    grid = BarangayRainfallGrid.objects.filter(barangay=barangay).first()
    if grid:
        return grid.grid_lat, grid.grid_lon
    centroid = barangay.boundary.centroid
    return round(centroid.y, 4), round(centroid.x, 4)


def _fetch_cell(lat: float, lon: float, model_param: str) -> dict:
    # Imported here: tasks imports the services package.
    from rainfall_fetch.tasks import _get_with_retry

    if not budget.can_spend(1):
        raise ForecastUnavailable("Open-Meteo daily call limit reached.")
    try:
        return _get_with_retry(forecast_url(lat, lon, model_param), retries=1).json()
    except Exception as exc:  # noqa: BLE001 - surfaced to the caller as one error type
        raise ForecastUnavailable(str(exc)) from exc


def forecast_for(barangay: Barangay) -> dict:
    """Cached outlook (now to 11 PM tomorrow) for `barangay`; raises `ForecastUnavailable` if the source is down."""
    lat, lon = _cell_for(barangay)
    model_param = RainfallSettings.cached().model_param
    key = f"rainfall:outlook:{model_param}:{lat}:{lon}"

    cached = cache.get(key)
    if cached is None:
        cached = {"generated_at": timezone.now(), "data": _fetch_cell(lat, lon, model_param)}
        cache.set(key, cached, timeout=CACHE_SECONDS)

    hours = parse_hours(cached["data"], timezone.now())
    return {
        "barangay": barangay.id,
        "name": barangay.name,
        "generated_at": cached["generated_at"].isoformat(),
        "warning_hours": WARNING_HOURS,
        "hours": hours,
        "summary": summarise(hours),
    }
