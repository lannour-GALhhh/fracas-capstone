"""Latest risk snapshot cached in Redis."""

from __future__ import annotations

from datetime import datetime

from django.core.cache import cache

SNAPSHOT_KEY = "risk:snapshot:latest"
ZONES_SNAPSHOT_KEY = "risk:snapshot:zones"
SNAPSHOT_TTL = 60 * 60 * 3  # 3h — longer than the hourly cycle, short enough to expire staleness


def store(computed_at: datetime, entries: list[dict]) -> dict:
    payload = {
        "computed_at": computed_at.isoformat(),
        "count": len(entries),
        "barangays": entries,
    }
    cache.set(SNAPSHOT_KEY, payload, timeout=SNAPSHOT_TTL)
    return payload


def store_zones(computed_at: datetime, entries: list[dict]) -> dict:
    """Per-zone (barangay x susceptibility level) latest scores for the map layer."""
    payload = {
        "computed_at": computed_at.isoformat(),
        "count": len(entries),
        "zones": entries,
    }
    cache.set(ZONES_SNAPSHOT_KEY, payload, timeout=SNAPSHOT_TTL)
    return payload


def read() -> dict | None:
    return cache.get(SNAPSHOT_KEY)


def read_zones() -> dict | None:
    return cache.get(ZONES_SNAPSHOT_KEY)


def latest() -> dict:
    """Cached snapshot, or one rebuilt from the newest RiskScore per barangay."""
    cached = read()
    if cached is not None:
        return cached

    from rainfall_fetch.models import Rainfall
    from risk_score.models import RiskScore

    rows = (
        RiskScore.objects.order_by("barangay_id", "-computed_at")
        .distinct("barangay_id")
        .select_related("barangay")
    )
    latest_rainfall = (
        Rainfall.objects.order_by("barangay_id", "-recorded_at").distinct("barangay_id")
    )
    rainfall_by_barangay = {r.barangay_id: r.current_rainfall_strength for r in latest_rainfall}
    entries = [
        {
            "id": r.barangay_id,
            "name": r.barangay.name,
            "score": round(r.score, 2),
            "category": r.category,
            "is_degraded": r.is_degraded,
            "current_rainfall": rainfall_by_barangay.get(r.barangay_id),
        }
        for r in rows
    ]
    computed_at = max((r.computed_at for r in rows), default=None)
    return {
        "computed_at": computed_at.isoformat() if computed_at else None,
        "count": len(entries),
        "barangays": entries,
    }


def zones_latest() -> dict:
    """Cached per-zone snapshot, or one rebuilt from the newest RiskScore breakdowns."""
    cached = read_zones()
    if cached is not None:
        return cached

    from risk_score.models import RiskScore

    rows = (
        RiskScore.objects.order_by("barangay_id", "-computed_at")
        .distinct("barangay_id")
    )
    entries = []
    computed_at = None
    for r in rows:
        computed_at = max(computed_at, r.computed_at) if computed_at else r.computed_at
        for zone in (r.breakdown or {}).get("zones", []):
            entries.append(
                {
                    "barangay_id": r.barangay_id,
                    "level": zone["level"],
                    "score": zone["score"],
                    "category": zone["category"],
                }
            )
    return {
        "computed_at": computed_at.isoformat() if computed_at else None,
        "count": len(entries),
        "zones": entries,
    }
