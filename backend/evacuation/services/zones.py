"""Per-zone risk lookup for zone-scoped evacuations."""

from __future__ import annotations

from risk_score.constants import RiskCategory
from risk_score.models import RiskScore

# Zones at these categories are preselected / auto-included when none are chosen.
QUALIFYING = {RiskCategory.HIGH.value, RiskCategory.CRITICAL.value}


def latest_zones(barangay) -> list[dict]:
    """The barangay's zones from its newest score: [{level, score, category}]."""
    score = RiskScore.objects.filter(barangay=barangay).order_by("-computed_at").first()
    return [
        {"level": z["level"], "score": z["score"], "category": z["category"]}
        for z in ((score.breakdown or {}).get("zones", []) if score else [])
    ]


def resolve(barangay, levels: list[str] | None) -> list[dict] | None:
    """Zones to evacuate: the requested levels, or every qualifying zone.

    Returns [] when nothing qualifies, None when a requested level doesn't exist.
    """
    zones = latest_zones(barangay)
    if levels is None:
        return [z for z in zones if z["category"] in QUALIFYING]
    by_level = {z["level"]: z for z in zones}
    if any(level not in by_level for level in levels):
        return None
    return [by_level[level] for level in dict.fromkeys(levels)]
