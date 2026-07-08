"""KPI summary row for the operator analytics page.

Blends *windowed* flood impact (events / people affected in the look-back) with
*current* situational state (barangays presently high/critical, latest
validation recall) into one cheap payload.
"""

from django.db.models import Count, Sum

from alert.models import AlertState
from flood_events.models import FloodEvent
from risk_score.constants import RiskCategory
from risk_score.models import ValidationRun


def _confirmed_events(since):
    """Confirmed, not-soft-deleted flood events since `since`.

    Auto-detected drafts awaiting LGU confirmation and soft-deleted rows are
    excluded so operator-facing counts never overstate reality.
    """
    return FloodEvent.objects.filter(
        occurred_at__gte=since, deleted_at__isnull=True, is_confirmed=True
    )


def _latest_validation():
    run = ValidationRun.objects.filter(status=ValidationRun.Status.DONE).first()
    if run is None:
        return None
    return {
        "recall": run.recall,
        "mean_score": run.mean_score,
        "events_evaluated": run.events_evaluated,
        "created_at": run.created_at,
    }


def build_summary(since):
    events = _confirmed_events(since)
    impact = events.aggregate(
        people_affected=Sum("people_affected"),
        people_evacuated=Sum("people_evacuated"),
    )
    # Current risk distribution comes from AlertState (one row per barangay,
    # overwritten each cycle) — cheaper than re-deriving from RiskScore history.
    level_counts = dict(
        AlertState.objects.values_list("level").annotate(n=Count("pk"))
    )
    return {
        "flood_events": events.count(),
        "people_affected": impact["people_affected"] or 0,
        "people_evacuated": impact["people_evacuated"] or 0,
        "barangays_critical": level_counts.get(RiskCategory.CRITICAL, 0),
        "barangays_high": level_counts.get(RiskCategory.HIGH, 0),
        "validation": _latest_validation(),
    }
