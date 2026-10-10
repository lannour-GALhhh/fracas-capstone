"""External-cron job registry + runner.

Jobs are triggered over HTTP by an external scheduler (cron-job.org) instead of
Celery Beat, so no worker/broker is needed. Each job runs in a background
thread (HTTP schedulers time out in ~30s; the pipeline can take longer) guarded
by a cache lock so overlapping pings never run the same job twice.
"""

import logging
import threading
from typing import Callable

from django.core.cache import cache
from django.db import close_old_connections

logger = logging.getLogger(__name__)

LOCK_TTL_SECONDS = 15 * 60  # safety net if a run dies without releasing


def _pipeline() -> dict:
    # Sequential, so scoring always runs on the fresh rainfall data.
    from rainfall_fetch.tasks import fetch_rainfall_information
    from risk_score.tasks import compute_risk_scores, draft_auto_flood_events

    fetch_rainfall_information()
    compute_risk_scores()
    return draft_auto_flood_events()


def _cleanup() -> dict:
    from monitoring.tasks import cleanup_old_data

    return cleanup_old_data()


def _purge_deleted_flood_events() -> dict:
    from flood_events.tasks import purge_deleted_flood_events

    return purge_deleted_flood_events()


def _purge_archived_flood_events() -> dict:
    from flood_events.tasks import purge_archived_flood_events

    return purge_archived_flood_events()


def _purge_archived_centers() -> dict:
    from evacuation.tasks import purge_archived_centers

    return purge_archived_centers()


# name (URL slug) -> callable. Suggested cron-job.org cadence in comments.
JOBS: dict[str, Callable[[], object]] = {
    "pipeline": _pipeline,                                   # every 10 min
    "cleanup": _cleanup,                                     # daily 03:00
    "purge-deleted-flood-events": _purge_deleted_flood_events,    # hourly
    "purge-archived-flood-events": _purge_archived_flood_events,  # daily 03:45
    "purge-archived-centers": _purge_archived_centers,       # daily 03:30
}

STARTED, ALREADY_RUNNING = "started", "already_running"


def _lock_key(name: str) -> str:
    return f"cron:lock:{name}"


def _run(name: str) -> None:
    try:
        JOBS[name]()
        logger.info("Cron job %s finished", name)
    except Exception:
        logger.exception("Cron job %s failed", name)
    finally:
        cache.delete(_lock_key(name))
        close_old_connections()  # thread-owned DB connection


def _spawn(target: Callable[[], None]) -> None:
    threading.Thread(target=target, daemon=True).start()


def trigger(name: str) -> str:
    """Start job `name` in the background unless it is already running."""
    if not cache.add(_lock_key(name), 1, LOCK_TTL_SECONDS):
        return ALREADY_RUNNING
    _spawn(lambda: _run(name))
    return STARTED
