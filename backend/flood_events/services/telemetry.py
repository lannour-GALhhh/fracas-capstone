"""Derive real telemetry for a flood event from retained time-series history.

The `FloodEvent` row itself is sparse (validation ground truth). The rich
detail view is reconstructed at read time by looking at the worst rainfall /
risk readings recorded *around* the event — no telemetry is duplicated onto
the event, and no numbers are fabricated. Every block is None-safe: a source
with no readings in the window is reported as unavailable rather than zeroed,
mirroring the risk engine's `available` convention.
"""

from datetime import timedelta

from rainfall_fetch.models import Rainfall
from risk_score.models import RiskScore

DEFAULT_WINDOW_HOURS = 6


def _peak_rainfall(barangay_id, lo, hi):
    """The barangay's most intense rainfall reading in the window."""
    reading = (
        Rainfall.objects.filter(barangay_id=barangay_id, recorded_at__range=(lo, hi))
        .order_by("-current_rainfall_strength")
        .first()
    )
    if reading is None:
        return None
    return {
        "peak_intensity": reading.current_rainfall_strength,
        "peak_accumulation_24hr": reading.accumulated_24hr,
        "recorded_at": reading.recorded_at.isoformat(),
    }


def _peak_risk(barangay_id, lo, hi):
    """The barangay's highest computed hazard score in the window."""
    score = (
        RiskScore.objects.filter(barangay_id=barangay_id, computed_at__range=(lo, hi))
        .order_by("-score")
        .first()
    )
    if score is None:
        return None
    return {
        "peak_score": score.score,
        "category": score.category,
        "breakdown": score.breakdown,
        "computed_at": score.computed_at.isoformat(),
    }


def _centroid(barangay):
    """[lon, lat] of the barangay, for the affected-area map."""
    point = barangay.boundary.centroid
    return [point.x, point.y]


def build_event_telemetry(event, window_hours: int = DEFAULT_WINDOW_HOURS) -> dict:
    """Peak rainfall / risk readings in a window around `event.occurred_at`.

    Each block is None when no reading exists in the window. `location` is the
    barangay centroid so the detail view can frame the affected area.
    """
    lo = event.occurred_at - timedelta(hours=window_hours)
    hi = event.occurred_at + timedelta(hours=window_hours)
    return {
        "window_hours": window_hours,
        "rainfall": _peak_rainfall(event.barangay_id, lo, hi),
        "risk": _peak_risk(event.barangay_id, lo, hi),
        "location": _centroid(event.barangay),
    }
