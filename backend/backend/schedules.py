"""Celery Beat schedule.

Single source of truth for periodic tasks. As the ingest -> compute -> alert
pipeline lands, add its entries here so scheduling stays in one place.
"""

from celery.schedules import crontab

BEAT_SCHEDULE = {
    "scoring-pipeline-15min": {
        # Chains: fetch rainfall -> compute risk scores (so compute runs on
        # fresh data). Runs every 15 minutes for near-real-time warning.
        "task": "risk_score.tasks.run_scoring_pipeline",
        "schedule": crontab(minute="*/15"),
    },
    "cleanup-old-data-daily": {
        # Prune old rainfall / risk-score rows past their retention window.
        "task": "monitoring.tasks.cleanup_old_data",
        "schedule": crontab(hour=3, minute=0),
    },
    "purge-soft-deleted-flood-events-hourly": {
        # Hard-delete flood events soft-deleted past their 6h undo window.
        "task": "flood_events.tasks.purge_deleted_flood_events",
        "schedule": crontab(minute=0),
    },
}
