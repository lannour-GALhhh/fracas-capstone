"""Score an uploaded hourly rainfall series for one barangay and judge it against a flood mark.

Stateless: nothing is saved and the active RiskConfig is never modified; an aggregation
override is applied to an in-memory copy.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass
from datetime import datetime, timedelta

from barangays.services import dominant_susceptibility_by_barangay
from risk_score.constants import ZONE_AGGREGATIONS, RiskCategory
from risk_score.models import RiskConfig

from .engine import RiskEngine
from .factors import DEFAULT_FACTORS
from .hindcast import hindcast_score
from .rainfall_csv import RainfallSeries

CATEGORY_RANK = {RiskCategory.LOW: 0, RiskCategory.MEDIUM: 1, RiskCategory.HIGH: 2, RiskCategory.CRITICAL: 3}
WARMUP_HOURS = 23  # the 24h accumulation needs 23 earlier rows to be complete


@dataclass(frozen=True)
class SeriesTestParams:
    mark: datetime  # naive local hour of the declared flood
    hours_before: int = 4
    hours_after: int = 0
    min_category: RiskCategory = RiskCategory.HIGH
    aggregation: str | None = None  # None = use the active config's setting
    # False (default): each hour sees only rain up to that hour. True: the engine's 15-240 min
    # forecast inputs read the CSV's next 4 hours, i.e. a perfect forecast (what hindcast.py does).
    forecast_lookahead: bool = False


def build_engine(aggregation: str | None) -> RiskEngine:
    config = RiskConfig.get_active()
    if aggregation:
        if aggregation not in ZONE_AGGREGATIONS:
            raise ValueError(f"Unknown aggregation '{aggregation}'.")
        config = copy.copy(config)  # in-memory only; never saved
        config.zone_aggregation = aggregation
    return RiskEngine(config, DEFAULT_FACTORS)


def run_series_test(barangay, series: RainfallSeries, params: SeriesTestParams, *, susceptibility=None) -> dict:
    """Score every hour, then decide whether the system flagged the flood in time."""
    if susceptibility is None:
        susceptibility = dominant_susceptibility_by_barangay()
    engine = build_engine(params.aggregation)
    config = engine.config

    window_start = params.mark - timedelta(hours=params.hours_before)
    window_end = params.mark + timedelta(hours=params.hours_after)
    if not series.times[0] <= params.mark <= series.times[-1]:
        raise ValueError("The flood mark is outside the hours in the CSV.")

    stamps = [t.strftime("%Y-%m-%dT%H:%M") for t in series.times]
    needed = CATEGORY_RANK[params.min_category]
    points = []
    for i, hour in enumerate(series.times):
        end = len(stamps) if params.forecast_lookahead else i + 1  # hide the future unless asked
        data = {"hourly": {"time": stamps[:end], "precipitation": series.rain_mm[:end]}}
        scored = hindcast_score(barangay, hour, susceptibility, fetcher=lambda *_a, d=data: d, engine=engine)
        accumulated = round(sum(series.rain_mm[max(0, i - 23) : i + 1]), 2)
        points.append(
            {
                "time": hour.strftime("%Y-%m-%dT%H:%M"),
                "rain_mm": series.rain_mm[i],
                "accumulated_24hr": accumulated,
                "score": round(scored.score, 2),
                "category": scored.category.value,
                "flagged": CATEGORY_RANK[scored.category] >= needed,
                "in_window": window_start <= hour <= window_end,
                "is_mark": hour == params.mark,
                "partial_history": i < WARMUP_HOURS,
            }
        )

    in_window = [p for p in points if p["in_window"]]
    flagged_in = [p for p in in_window if p["flagged"]]
    first = flagged_in[0] if flagged_in else None
    peak = max(in_window, key=lambda p: p["score"]) if in_window else None
    outside = [p for p in points if p["flagged"] and not p["in_window"]]

    warnings = list(series.warnings)
    if any(p["partial_history"] for p in in_window):
        warnings.append(
            "Part of the test window falls in the first 23 hours of the CSV, where the 24-hour "
            "rainfall total is incomplete. Add earlier hours for a fair test."
        )
    if window_start < series.times[0]:
        warnings.append("The test window starts before the first hour in the CSV.")

    mark_dt = params.mark
    return {
        "barangay": {"id": barangay.id, "name": barangay.name},
        "config": {
            "name": config.name,
            "aggregation": config.zone_aggregation,
            "thresholds": config.thresholds,
        },
        "params": {
            "mark": mark_dt.strftime("%Y-%m-%dT%H:%M"),
            "window_start": window_start.strftime("%Y-%m-%dT%H:%M"),
            "window_end": window_end.strftime("%Y-%m-%dT%H:%M"),
            "hours_before": params.hours_before,
            "hours_after": params.hours_after,
            "min_category": params.min_category.value,
            "forecast_lookahead": params.forecast_lookahead,
            "score_needed": config.thresholds[params.min_category.value],
        },
        "result": {
            "success": first is not None,
            "first_detection_at": first["time"] if first else None,
            # Positive = the system flagged it this many hours ahead of the mark.
            "lead_hours": (
                (mark_dt - datetime.strptime(first["time"], "%Y-%m-%dT%H:%M")).total_seconds() / 3600
                if first
                else None
            ),
            "peak_score_in_window": peak["score"] if peak else None,
            "peak_category_in_window": peak["category"] if peak else None,
            "peak_rain_mm_hr_in_window": max((p["rain_mm"] for p in in_window), default=0.0),
            "peak_accumulated_24hr_in_window": max((p["accumulated_24hr"] for p in in_window), default=0.0),
            "flagged_hours_outside_window": len(outside),
            "hours_scored": len(points),
        },
        "series": points,
        "warnings": warnings,
    }
