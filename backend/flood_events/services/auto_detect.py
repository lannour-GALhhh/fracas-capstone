"""Auto-draft unconfirmed flood events from high risk scores (no risk_score import)."""

from datetime import timedelta

from django.utils import timezone

from ..models import (
    AutoDetectConfig,
    FloodEvent,
    FloodEventChange,
    FloodSeverity,
    SourceKind,
)
from . import changes

# low < medium < high < critical
CATEGORY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}
CATEGORY_TO_SEVERITY = {
    "medium": FloodSeverity.MINOR,
    "high": FloodSeverity.MODERATE,
    "critical": FloodSeverity.MAJOR,
}
# Don't re-draft the same barangay more than once inside this window.
DEDUPE_HOURS = 24


def _category_str(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


def draft_events(scores) -> dict:
    """Create unconfirmed auto flood events for barangays at/above the configured risk threshold."""
    config = AutoDetectConfig.get_solo()
    if not config.enabled:
        return {"created": 0, "reason": "disabled"}

    threshold = CATEGORY_RANK[config.threshold_category]
    window_start = timezone.now() - timedelta(hours=DEDUPE_HOURS)
    created = 0

    for score in scores:
        category = _category_str(score.category)
        if CATEGORY_RANK.get(category, 0) < threshold:
            continue
        already = FloodEvent.objects.filter(
            barangay_id=score.barangay_id,
            source_kind=SourceKind.AUTO,
            deleted_at__isnull=True,
            occurred_at__gte=window_start,
        ).exists()
        if already:
            continue

        event = FloodEvent.objects.create(
            barangay=score.barangay,
            occurred_at=score.computed_at,
            severity=CATEGORY_TO_SEVERITY.get(category, FloodSeverity.MODERATE),
            source_kind=SourceKind.AUTO,
            is_confirmed=False,
            source="Auto-detected",
            notes=(
                f"Auto-drafted from risk {category} ({score.score:.0f}/100). "
                "Awaiting LGU confirmation."
            ),
        )
        changes.log_action(event, FloodEventChange.Action.CREATED, None)
        created += 1

    return {"created": created}
