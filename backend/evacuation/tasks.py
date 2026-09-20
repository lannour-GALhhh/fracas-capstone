"""Evacuation Celery tasks."""

from celery import shared_task


@shared_task
def sync_evacuations() -> dict:
    from .services.lifecycle import reconcile

    return reconcile()
