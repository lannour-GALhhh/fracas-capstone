"""Maintenance tasks: prune high-volume time-series rows.

Rainfall and RiskScore each gain ~100 rows every 15-min cycle. A daily job
prunes rows past their retention window so the tables don't grow unbounded.
Models are imported lazily to keep monitoring free of import-time coupling.
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def cleanup_old_data() -> dict:
    from evacuation.models import Evacuation, EvacuationStatus
    from rainfall_fetch.models import Rainfall
    from risk_score.models import RiskScore

    from monitoring.models import RetentionPolicy

    policy = RetentionPolicy.cached()
    now = timezone.now()
    rain_deleted, _ = Rainfall.objects.filter(
        recorded_at__lt=now - timedelta(days=policy.rainfall_retention_days)
    ).delete()
    score_deleted, _ = RiskScore.objects.filter(
        computed_at__lt=now - timedelta(days=policy.risk_score_retention_days)
    ).delete()

    # Purge the per-resident working set of long-closed evacuations. The
    # Evacuation row keeps the frozen final counts, so this loses no history.
    evac_status_deleted, _ = EvacuationStatus.objects.filter(
        evacuation__status=Evacuation.Status.STOOD_DOWN,
        evacuation__closed_at__lt=now
        - timedelta(days=policy.evacuation_status_retention_days),
    ).delete()

    logger.info(
        "Retention cleanup: %d rainfall, %d risk-score, %d evacuation-status rows deleted",
        rain_deleted,
        score_deleted,
        evac_status_deleted,
    )
    return {
        "rainfall_deleted": rain_deleted,
        "risk_score_deleted": score_deleted,
        "evacuation_status_deleted": evac_status_deleted,
    }
