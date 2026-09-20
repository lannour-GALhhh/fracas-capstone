"""Hotspot leaderboard: barangays ranked by time-spent-in-danger."""

from django.db.models import Count, Q, Sum

from barangays.models import Barangay
from barangays.services import dominant_susceptibility_by_barangay
from risk_score.constants import RiskCategory
from risk_score.models import RiskScore

from .summary import _confirmed_events


def build_hotspots(since, limit=None):
    cycle_rows = (
        RiskScore.objects.filter(
            computed_at__gte=since,
            category__in=(RiskCategory.CRITICAL, RiskCategory.HIGH),
        )
        .values("barangay")
        .annotate(
            critical_cycles=Count("pk", filter=Q(category=RiskCategory.CRITICAL)),
            high_cycles=Count("pk", filter=Q(category=RiskCategory.HIGH)),
        )
    )
    cycles_by_brgy = {r["barangay"]: r for r in cycle_rows}

    flood_rows = (
        _confirmed_events(since)
        .values("barangay")
        .annotate(flood_count=Count("pk"), people_affected=Sum("people_affected"))
    )
    floods_by_brgy = {r["barangay"]: r for r in flood_rows}

    brgy_ids = set(cycles_by_brgy) | set(floods_by_brgy)
    barangays = Barangay.objects.filter(id__in=brgy_ids).values("id", "name")
    susceptibility_by_brgy = dominant_susceptibility_by_barangay()

    rows = []
    for b in barangays:
        cycles = cycles_by_brgy.get(b["id"], {})
        floods = floods_by_brgy.get(b["id"], {})
        susceptibility = susceptibility_by_brgy.get(b["id"])
        rows.append(
            {
                "barangay_id": b["id"],
                "barangay_name": b["name"],
                "dominant_level": susceptibility["level"] if susceptibility else None,
                "susceptibility_value": susceptibility["value"] if susceptibility else None,
                "critical_cycles": cycles.get("critical_cycles", 0),
                "high_cycles": cycles.get("high_cycles", 0),
                "flood_count": floods.get("flood_count", 0),
                "people_affected": floods.get("people_affected") or 0,
            }
        )

    rows.sort(
        key=lambda r: (r["critical_cycles"], r["high_cycles"], r["flood_count"]),
        reverse=True,
    )
    return rows[:limit] if limit else rows
