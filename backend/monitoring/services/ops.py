"""System-ops report for the admin console: pipeline freshness + cadence."""

from django.utils import timezone

from backend.schedules import BEAT_SCHEDULE

from ..constants import SOURCE_RAINFALL, STALE_AFTER
from . import health

# Human-readable cadence per scheduled task (Beat crontabs aren't self-describing).
CADENCE_LABELS = {
    "scoring-pipeline-15min": "Every 15 minutes",
    "cleanup-old-data-daily": "Daily at 03:00",
    "purge-soft-deleted-flood-events-hourly": "Hourly",
}


def _stage(last_run, threshold=None):
    if last_run is None:
        return {"last_run": None, "fresh": False}
    fresh = threshold is None or (timezone.now() - last_run) <= threshold
    return {"last_run": last_run.isoformat(), "fresh": fresh}


def _pipeline_stages() -> dict:
    from evacuation.models import Evacuation
    from rainfall_fetch.models import Rainfall
    from risk_score.models import RiskScore

    from ..models import IngestionHealth

    rainfall_row = IngestionHealth.objects.filter(source=SOURCE_RAINFALL).first()
    last_rainfall = rainfall_row.last_success_at if rainfall_row else (
        Rainfall.objects.order_by("-recorded_at").values_list("recorded_at", flat=True).first()
    )
    last_score = RiskScore.objects.order_by("-computed_at").values_list("computed_at", flat=True).first()
    last_evacuation = (
        Evacuation.objects.order_by("-opened_at").values_list("opened_at", flat=True).first()
    )

    # Scoring runs every 15 min; allow a cycle of slack before calling it stale.
    from datetime import timedelta

    return {
        "rainfall": _stage(last_rainfall, STALE_AFTER.get(SOURCE_RAINFALL)),
        "scoring": _stage(last_score, timedelta(minutes=30)),
        "evacuation": _stage(last_evacuation),
    }


def _cadence() -> list[dict]:
    return [
        {
            "task": key,
            "cadence": CADENCE_LABELS.get(key, str(entry["schedule"])),
        }
        for key, entry in BEAT_SCHEDULE.items()
    ]


def system_status() -> dict:
    report = health.status_report()
    report["pipeline"] = _pipeline_stages()
    report["cadence"] = _cadence()
    return report
