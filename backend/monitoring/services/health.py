"""Health checks behind the liveness / readiness / status endpoints.

  - liveness  = the process is up and serving (checked implicitly by the view).
  - readiness = its request-path dependencies (DB, cache) are reachable, so it
    can actually serve traffic.
  - status    = the full operational picture, including per-source ingestion
    freshness, for dashboards and operators.
"""

from django.core.cache import cache
from django.db import connection
from django.utils import timezone

from monitoring.constants import INGESTION_SOURCES, STALE_AFTER
from monitoring.models import IngestionHealth

_PROBE_KEY = "monitoring:readiness-probe"


def check_database() -> tuple[bool, str]:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True, "ok"
    except Exception as exc:  # noqa: BLE001 - report, don't crash the probe
        return False, str(exc)


def check_cache() -> tuple[bool, str]:
    try:
        cache.set(_PROBE_KEY, "1", timeout=10)
        if cache.get(_PROBE_KEY) != "1":
            return False, "cache readback mismatch"
        return True, "ok"
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


def check_ingestion() -> dict:
    """Per-source freshness: is the last successful ingest within threshold?"""
    now = timezone.now()
    rows = {h.source: h for h in IngestionHealth.objects.all()}
    result = {}
    for source in INGESTION_SOURCES:
        health = rows.get(source)
        threshold = STALE_AFTER.get(source)
        if health is None or health.last_success_at is None:
            result[source] = {"fresh": False, "last_success_at": None, "status": "no data"}
            continue
        fresh = threshold is None or (now - health.last_success_at) <= threshold
        result[source] = {
            "fresh": fresh,
            "last_success_at": health.last_success_at.isoformat(),
            "status": health.last_status,
            "consecutive_failures": health.consecutive_failures,
        }
    return result


def readiness() -> tuple[bool, dict]:
    """DB + cache reachability. Drives the 200/503 readiness probe."""
    db_ok, db_detail = check_database()
    cache_ok, cache_detail = check_cache()
    ready = db_ok and cache_ok
    return ready, {
        "ready": ready,
        "database": {"ok": db_ok, "detail": db_detail},
        "cache": {"ok": cache_ok, "detail": cache_detail},
    }


def status_report() -> dict:
    """Full operational report: readiness + ingestion freshness."""
    ready, checks = readiness()
    ingestion = check_ingestion()
    ingestion_ok = all(s["fresh"] for s in ingestion.values())
    return {
        "healthy": ready and ingestion_ok,
        "database": checks["database"],
        "cache": checks["cache"],
        "ingestion": ingestion,
    }
