"""Forecast-horizon maths for the rainfall factor — pure functions, no DB."""

from __future__ import annotations

import math

from risk_score.constants import (
    FAR_PEAK_DECAY_PER_HOUR,
    FLOOD_HOUR_MM_HR,
    FORECAST_LOAD_DECAY_HOURS,
    HORIZON_STAGES,
    HOURLY_BASE_HORIZON,
    HOURLY_MAX_HORIZON,
)


def hourly_series(rainfall) -> list[float]:
    """[current, +1h, ... +12h] in mm/hr. Missing hours (older rows, test doubles) read as 0."""
    values = [getattr(rainfall, "hourly_current", 0.0) or 0.0]
    values += [getattr(rainfall, f"hourly_forecast_{k}hr", 0.0) or 0.0 for k in range(1, HOURLY_MAX_HORIZON + 1)]
    return values


def active_horizon(series: list[float]) -> int:
    """How many forecast hours to read. Starts at the base window and widens stage by stage,
    but only while the hour at each checkpoint (4th, then 9th) itself looks like a flood."""
    horizon = HOURLY_BASE_HORIZON
    for checkpoint, unlocked in HORIZON_STAGES:
        if horizon == checkpoint and series[checkpoint] >= FLOOD_HOUR_MM_HR:
            horizon = unlocked
    return horizon


def forecast_load(series: list[float], horizon: int) -> float:
    """Forecast rain (mm) over hours 1..horizon, each discounted by its lead time."""
    return sum(series[k] * math.exp(-k / FORECAST_LOAD_DECAY_HOURS) for k in range(1, horizon + 1))


def weighted_peak(series: list[float], horizon: int) -> float:
    """Peak intensity over the current hour and the active horizon; far hours count a bit less."""
    def weight(k: int) -> float:
        return 1.0 if k <= HOURLY_BASE_HORIZON else FAR_PEAK_DECAY_PER_HOUR ** (k - HOURLY_BASE_HORIZON)

    return max(series[k] * weight(k) for k in range(0, horizon + 1))
