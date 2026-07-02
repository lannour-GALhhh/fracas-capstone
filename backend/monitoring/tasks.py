"""Maintenance tasks: prune high-volume time-series rows.

Rainfall and RiskScore each gain ~100 rows every 15-min cycle. A daily job
prunes rows past their retention window so the tables don't grow unbounded.
Models are imported lazily to keep monitoring free of import-time coupling.
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from monitoring.constants import RAINFALL_RETENTION_DAYS, RISK_SCORE_RETENTION_DAYS

logger = logging.getLogger(__name__)


@shared_task
def cleanup_old_data() -> dict:
    from rainfall_fetch.models import Rainfall
    from risk_score.models import RiskScore

    now = timezone.now()
    rain_deleted, _ = Rainfall.objects.filter(
        recorded_at__lt=now - timedelta(days=RAINFALL_RETENTION_DAYS)
    ).delete()
    score_deleted, _ = RiskScore.objects.filter(
        computed_at__lt=now - timedelta(days=RISK_SCORE_RETENTION_DAYS)
    ).delete()

    logger.info(
        "Retention cleanup: %d rainfall, %d risk-score rows deleted",
        rain_deleted,
        score_deleted,
    )
    return {"rainfall_deleted": rain_deleted, "risk_score_deleted": score_deleted}
