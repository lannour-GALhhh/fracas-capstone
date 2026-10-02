"""Evacuation Celery tasks."""

from datetime import timedelta

from celery import shared_task
from django.utils import timezone

# Archived centers stay restorable for this long, then are hard-deleted.
ARCHIVE_RETENTION_DAYS = 30


@shared_task
def sync_evacuations() -> dict:
    from .services.lifecycle import reconcile

    return reconcile()


@shared_task
def purge_archived_centers() -> dict:
    """Hard-delete evacuation centers archived longer than the retention window."""
    from .models import EvacuationCenter

    cutoff = timezone.now() - timedelta(days=ARCHIVE_RETENTION_DAYS)
    purged, _ = EvacuationCenter.objects.filter(archived_at__lt=cutoff).delete()
    return {"purged": purged}
