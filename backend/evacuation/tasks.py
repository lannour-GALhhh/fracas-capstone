"""Evacuation Celery tasks.

``sync_evacuations`` is the pipeline step after ``evaluate_alerts``: it opens
automated evacuations for barangays that just entered the alert trigger band and
stands down automated ones whose hazard has cleared. The reconciliation logic
lives in ``services.lifecycle`` (imported lazily so the worker boots cheaply).
"""

from celery import shared_task


@shared_task
def sync_evacuations() -> dict:
    from .services.lifecycle import reconcile

    return reconcile()
