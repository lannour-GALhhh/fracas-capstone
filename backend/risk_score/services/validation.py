"""Validate the risk model against recorded flood events (via hindcasting).

For each FloodEvent we reconstruct and score the barangay at the event time,
then check whether the model would have flagged it HIGH/CRITICAL. Recall
(detection rate) is the headline metric: of real floods, how many did the
model catch. False-alarm rate needs verified no-flood periods and is left for
operational validation once the system accrues live history.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.db.models import Max, Min

from barangays.models import Barangay
from flood_events.models import FloodEvent
from risk_score.constants import RiskCategory

from .hindcast import HindcastError, hindcast_score

HIT_CATEGORIES = {RiskCategory.HIGH, RiskCategory.CRITICAL}


@dataclass
class EventOutcome:
    event: FloodEvent
    score: float | None
    category: str | None
    hit: bool
    error: str | None = None


@dataclass
class ValidationReport:
    outcomes: list[EventOutcome]

    @property
    def evaluated(self) -> list[EventOutcome]:
        return [o for o in self.outcomes if o.error is None]

    @property
    def recall(self) -> float | None:
        n = len(self.evaluated)
        return sum(o.hit for o in self.evaluated) / n if n else None

    @property
    def mean_score(self) -> float | None:
        scores = [o.score for o in self.evaluated]
        return sum(scores) / len(scores) if scores else None


def _elevation_bounds():
    agg = Barangay.objects.aggregate(low=Min("land_height_mean"), high=Max("land_height_mean"))
    if agg["low"] is None or agg["high"] is None:
        return None
    return (agg["low"], agg["high"])


def validate(events=None, *, fetcher=None) -> ValidationReport:
    bounds = _elevation_bounds()
    events = events if events is not None else FloodEvent.objects.select_related("barangay")
    fetch_kwargs = {"fetcher": fetcher} if fetcher is not None else {}

    outcomes = []
    for event in events:
        try:
            result = hindcast_score(event.barangay, event.occurred_at, bounds, **fetch_kwargs)
            outcomes.append(
                EventOutcome(event, round(result.score, 2), result.category.value, result.category in HIT_CATEGORIES)
            )
        except HindcastError as exc:
            outcomes.append(EventOutcome(event, None, None, False, error=str(exc)))
    return ValidationReport(outcomes)
