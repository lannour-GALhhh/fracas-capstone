"""KPI summary row for the operator analytics page."""

from collections import Counter

from django.db.models import Sum

from flood_events.models import FloodEvent
from risk_score.constants import RiskCategory
from risk_score.models import RiskScore, ValidationRun


def _confirmed_events(since):
    """Confirmed, not-soft-deleted flood events since `since`."""
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
    latest_categories = (
        RiskScore.objects.order_by("barangay_id", "-computed_at")
        .distinct("barangay_id")
        .values_list("category", flat=True)
    )
    level_counts = Counter(latest_categories)
    return {
        "flood_events": events.count(),
        "people_affected": impact["people_affected"] or 0,
        "people_evacuated": impact["people_evacuated"] or 0,
        "barangays_critical": level_counts.get(RiskCategory.CRITICAL, 0),
        "barangays_high": level_counts.get(RiskCategory.HIGH, 0),
        "validation": _latest_validation(),
    }
