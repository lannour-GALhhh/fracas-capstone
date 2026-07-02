"""Lightweight Celery task metrics via signals.

Logs every task outcome under the ``celery.metrics`` logger so pipeline
failures are visible (and scrapeable) instead of vanishing silently. Connected
once from ``backend.celery``.
"""

import logging

from celery.signals import task_failure, task_retry, task_success

logger = logging.getLogger("celery.metrics")


@task_failure.connect
def on_task_failure(sender=None, task_id=None, exception=None, **kwargs):
    logger.error(
        "task_failed name=%s id=%s error=%s",
        getattr(sender, "name", "?"),
        task_id,
        exception,
    )


@task_retry.connect
def on_task_retry(sender=None, reason=None, **kwargs):
    logger.warning("task_retry name=%s reason=%s", getattr(sender, "name", "?"), reason)


@task_success.connect
def on_task_success(sender=None, result=None, **kwargs):
    logger.info("task_succeeded name=%s", getattr(sender, "name", "?"))
