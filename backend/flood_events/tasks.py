"""Maintenance tasks for flood events."""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# Soft-deleted events stay recoverable for this long, then are hard-purged.
PURGE_AFTER_HOURS = 6

# Archived events stay restorable for this long, then are hard-purged.
ARCHIVE_RETENTION_DAYS = 30


@shared_task
def purge_deleted_flood_events() -> dict:
    """Hard-delete flood events soft-deleted past the retention grace window."""
    from monitoring.models import RetentionPolicy

    from .models import FloodEvent

    grace_hours = RetentionPolicy.cached().flood_event_purge_grace_hours
    cutoff = timezone.now() - timedelta(hours=grace_hours)
    purged, _ = FloodEvent.objects.filter(deleted_at__lt=cutoff).delete()
    logger.info("Purged %d soft-deleted flood event(s)", purged)
    return {"purged": purged}


@shared_task
def purge_archived_flood_events() -> dict:
    """Hard-delete flood events archived longer than the retention window."""
    from .models import FloodEvent

    cutoff = timezone.now() - timedelta(days=ARCHIVE_RETENTION_DAYS)
    purged, _ = FloodEvent.objects.filter(archived_at__lt=cutoff).delete()
    logger.info("Purged %d archived flood event(s)", purged)
    return {"purged": purged}
