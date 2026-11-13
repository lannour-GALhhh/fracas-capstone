"""What-if rainfall: score hypothetical hourly rain for many barangays through the real engine.

Stateless, like series_test: nothing is stored and the active RiskConfig is never modified.
Each barangay's hourly series is scored hour by hour (with the next 4 hours as the forecast,
as the live pipeline has), so the map can scrub through a storm as it builds and passes.
"""

from __future__ import annotations

from types import SimpleNamespace

from barangays.services import dominant_susceptibility_by_barangay
from risk_score.models import RiskConfig

from .engine import RiskEngine
from .factors import DEFAULT_FACTORS, FactorInput

MAX_BARANGAYS = 200
MAX_HOURS = 72


def _rainfall_at(rain: list[float], i: int) -> SimpleNamespace:
    def at(j: int) -> float:
        return rain[j] if 0 <= j < len(rain) else 0.0

    return SimpleNamespace(
        hourly_current=at(i),
        **{f"hourly_forecast_{k}hr": at(i + k) for k in range(1, 5)},
        accumulated_6hr=round(sum(at(j) for j in range(i - 5, i + 1)), 2),
        accumulated_24hr=round(sum(at(j) for j in range(i - 23, i + 1)), 2),
    )


def simulate(barangays, rain_by_id: dict[int, list[float]]) -> list[dict]:
    """Score `rain_by_id[barangay.id]` (hourly mm) at every hour; one result row per barangay."""
    config = RiskConfig.get_active()
    engine = RiskEngine(config, DEFAULT_FACTORS)
    susceptibility = dominant_susceptibility_by_barangay()
    context = SimpleNamespace(
        susceptibility_for=lambda b: susceptibility.get(b.id),
        zones_for=lambda b: (susceptibility.get(b.id) or {}).get("zones", []),
        rainfall_curve=getattr(config, "rainfall_curve", None),
        accumulation_curve=getattr(config, "accumulation_curve", None),
    )

    results = []
    for barangay in barangays:
        rain = rain_by_id[barangay.id]
        steps = []
        for i in range(len(rain)):
            rainfall = _rainfall_at(rain, i)
            scored = engine.score(FactorInput(barangay, rainfall, context))
            steps.append(
                {
                    "rain_mm_hr": rain[i],
                    "accumulated_24hr": rainfall.accumulated_24hr,
                    "score": round(scored.score, 2),
                    "category": scored.category.value,
                }
            )
        results.append({"id": barangay.id, "name": barangay.name, "steps": steps})
    return results
