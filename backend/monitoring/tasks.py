"""Maintenance tasks: prune high-volume time-series rows past their retention window."""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def cleanup_old_data() -> dict:
    from evacuation.models import Evacuation, EvacuationStatus
    from rainfall_fetch.models import HourlyRainfall, Rainfall
    from risk_score.models import RiskScore

    from monitoring.models import RetentionPolicy

    policy = RetentionPolicy.cached()
    now = timezone.now()
    rain_deleted, _ = Rainfall.objects.filter(
        recorded_at__lt=now - timedelta(days=policy.rainfall_retention_days)
    ).delete()
    # Hourly buckets only feed the 7-day window; keep a day of slack.
    HourlyRainfall.objects.filter(hour__lt=now - timedelta(days=8)).delete()
    score_deleted, _ = RiskScore.objects.filter(
        computed_at__lt=now - timedelta(days=policy.risk_score_retention_days)
    ).delete()

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


@shared_task
def run_cron_job(name: str) -> str:
    """Run a registered cron job synchronously, under the same lock as the HTTP trigger."""
    from django.core.cache import cache

    from monitoring.services import cron

    if not cache.add(cron._lock_key(name), 1, cron.LOCK_TTL_SECONDS):
        return cron.ALREADY_RUNNING
    cron._run(name)  # releases the lock when done
    return "finished"
