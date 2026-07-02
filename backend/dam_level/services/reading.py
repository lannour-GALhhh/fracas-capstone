"""Shared dam-reading construction.

Derives rate-of-rise and the spilling flag the same way for every source, so a
manual operator entry and a scraped reading are computed identically. Used by
the ingestion task and the admin manual-entry path.
"""

from __future__ import annotations

from datetime import datetime

from dam_level.models import Dam, DamReading


def rate_of_change(
    previous: DamReading | None, water_level: float, recorded_at: datetime
) -> float | None:
    if previous is None:
        return None
    hours = (recorded_at - previous.recorded_at).total_seconds() / 3600
    if hours <= 0:
        return None
    return (water_level - previous.water_level) / hours


def make_reading(
    dam: Dam,
    previous: DamReading | None,
    *,
    water_level: float,
    recorded_at: datetime,
    turbidity: float | None = None,
    source: str = DamReading.Source.SCRAPER,
) -> DamReading:
    """Build (unsaved) a reading with derived rate-of-rise and spilling flag."""
    return DamReading(
        dam=dam,
        water_level=water_level,
        turbidity=turbidity,
        rate_of_change=rate_of_change(previous, water_level, recorded_at),
        is_spilling=water_level > dam.normal_level,
        recorded_at=recorded_at,
        source=source,
    )
