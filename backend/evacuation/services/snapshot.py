"""Cached derived aggregate for the operator evacuation dashboard.

Mirrors ``risk_score.services.snapshot``: every poller reads one cache key
instead of the DB. The value is a memoized ``GROUP BY`` over the *reported*
``EvacuationStatus`` rows plus the per-barangay subscriber roster, so it is
self-healing (expire -> recompute the truth) and can never drift the way
hand-maintained increment counters would.

``unaccounted`` is derived here, not stored: ``roster - reporters`` are the
subscribers we've heard nothing from.
"""

from __future__ import annotations

from django.core.cache import cache
from django.db.models import Count, Max

DASHBOARD_KEY = "evac:dashboard"
DASHBOARD_TTL = 15  # seconds — short backstop; refreshed on write (see report view)


def compute() -> list[dict]:
    """Recompute the aggregate straight from the DB (the source of truth)."""
    from users.models import Subscription

    from ..models import Evacuation, EvacuationStatus

    active = list(
        Evacuation.objects.filter(status=Evacuation.Status.ACTIVE).select_related(
            "barangay"
        )
    )
    if not active:
        return []

    barangay_ids = [e.barangay_id for e in active]

    # Denominator: subscriber roster per barangay (one grouped query).
    roster = dict(
        Subscription.objects.filter(barangay_id__in=barangay_ids)
        .values_list("barangay_id")
        .annotate(n=Count("id"))
        .values_list("barangay_id", "n")
    )

    # Reported status counts per evacuation (one grouped query).
    counts: dict[int, dict[str, int]] = {}
    for row in (
        EvacuationStatus.objects.filter(evacuation__in=active)
        .values("evacuation_id", "status")
        .annotate(n=Count("id"))
    ):
        counts.setdefault(row["evacuation_id"], {})[row["status"]] = row["n"]

    # Latest activity per evacuation, for a freshness readout.
    last_seen = dict(
        EvacuationStatus.objects.filter(evacuation__in=active)
        .values_list("evacuation_id")
        .annotate(m=Max("updated_at"))
        .values_list("evacuation_id", "m")
    )

    entries = []
    for e in active:
        c = counts.get(e.id, {})
        safe = c.get(EvacuationStatus.Status.SAFE, 0)
        moving = c.get(EvacuationStatus.Status.MOVING, 0)
        notified = c.get(EvacuationStatus.Status.NOTIFIED, 0)
        r = roster.get(e.barangay_id, 0)
        # Everyone in the roster we haven't heard an informative report from.
        # Clamp at 0 in case a non-subscriber ever reports.
        unaccounted = max(r - (safe + moving + notified), 0)
        updated = last_seen.get(e.id) or e.opened_at
        entries.append(
            {
                "evacuation_id": e.id,
                "barangay": {"id": e.barangay_id, "name": e.barangay.name},
                "trigger": e.trigger,
                "opened_at": e.opened_at.isoformat(),
                "roster": r,
                "safe": safe,
                "moving": moving,
                "unaccounted": unaccounted,
                "updated_at": updated.isoformat(),
            }
        )
    return entries


def get_dashboard() -> list[dict]:
    """Read-through: cache hit -> zero DB; miss/expired -> recompute once + cache."""
    cached = cache.get(DASHBOARD_KEY)
    if cached is not None:
        return cached
    return refresh()


def refresh() -> list[dict]:
    """Recompute and reset the cache. Called on write to keep it warm."""
    entries = compute()
    cache.set(DASHBOARD_KEY, entries, timeout=DASHBOARD_TTL)
    return entries


def invalidate() -> None:
    cache.delete(DASHBOARD_KEY)
