"""Record ingestion outcomes — called by the dam and rainfall tasks.

These helpers must never raise: health tracking observes the pipeline, it must
not be able to break it. Any error is logged and swallowed.
"""

import logging

from django.utils import timezone

from monitoring.models import IngestionHealth

logger = logging.getLogger(__name__)


def record_success(source: str) -> None:
    now = timezone.now()
    try:
        IngestionHealth.objects.update_or_create(
            source=source,
            defaults={
                "last_run_at": now,
                "last_success_at": now,
                "last_status": IngestionHealth.Status.OK,
                "last_error": "",
                "consecutive_failures": 0,
            },
        )
    except Exception:  # noqa: BLE001 - observability must not break ingestion
        logger.exception("Failed to record ingestion success for %s", source)


def record_failure(source: str, error: str) -> None:
    try:
        health, _ = IngestionHealth.objects.get_or_create(source=source)
        health.last_run_at = timezone.now()
        health.last_status = IngestionHealth.Status.FAILED
        health.last_error = (error or "")[:2000]
        health.consecutive_failures += 1
        health.save(
            update_fields=[
                "last_run_at",
                "last_status",
                "last_error",
                "consecutive_failures",
                "updated_at",
            ]
        )
    except Exception:  # noqa: BLE001 - observability must not break ingestion
        logger.exception("Failed to record ingestion failure for %s", source)
