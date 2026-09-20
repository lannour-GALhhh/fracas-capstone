"""Monitoring constants: ingestion source names and staleness thresholds."""

from datetime import timedelta

SOURCE_RAINFALL = "rainfall"
INGESTION_SOURCES = (SOURCE_RAINFALL,)

# A reading older than this is treated as stale.
STALE_AFTER = {
    SOURCE_RAINFALL: timedelta(hours=1),
}

# Retention windows for high-volume time series, pruned by the daily cleanup task.
RAINFALL_RETENTION_DAYS = 30
RISK_SCORE_RETENTION_DAYS = 90
EVACUATION_STATUS_RETENTION_DAYS = 7
