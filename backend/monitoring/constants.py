"""Monitoring constants: ingestion source names and staleness thresholds.

The thresholds are shared by two consumers:
  - the readiness/status health checks (is a source still fresh?), and
  - the scoring engine, which treats a reading older than its threshold as
    missing so a stale input degrades the score instead of silently emitting a
    false-low "everything is calm".
"""

from datetime import timedelta

SOURCE_DAM = "dam"
SOURCE_RAINFALL = "rainfall"
INGESTION_SOURCES = (SOURCE_DAM, SOURCE_RAINFALL)

# A reading older than this is treated as stale. Rainfall is re-fetched every
# 15-min cycle; the ZCWD dam source updates less frequently, so it is lenient.
STALE_AFTER = {
    SOURCE_RAINFALL: timedelta(hours=1),
    SOURCE_DAM: timedelta(hours=3),
}

# Retention windows for high-volume time series (pruned by the daily cleanup
# task). RiskScore is kept longer because it feeds flood history / validation.
RAINFALL_RETENTION_DAYS = 30
RISK_SCORE_RETENTION_DAYS = 90
