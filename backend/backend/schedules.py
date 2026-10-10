"""Cadence of the periodic jobs. Single source of truth.

Jobs are fired over HTTP by an external scheduler (cron-job.org) hitting
POST /api/cron/<job>/ with the X-Cron-Key header. Keys here must match
`monitoring.services.cron.JOBS`; values are what the admin console displays
and what to enter in cron-job.org.
"""

CRON_SCHEDULE = {
    "pipeline": {"cron": "*/10 * * * *", "label": "Every 10 minutes"},
    "cleanup": {"cron": "0 3 * * *", "label": "Daily at 03:00"},
    "purge-deleted-flood-events": {"cron": "0 * * * *", "label": "Hourly"},
    "purge-archived-centers": {"cron": "30 3 * * *", "label": "Daily at 03:30"},
    "purge-archived-flood-events": {"cron": "45 3 * * *", "label": "Daily at 03:45"},
}
