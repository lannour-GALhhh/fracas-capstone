"""Composes factor contributions into a single hazard score.

Two combination modes, selected by the active RiskConfig:

- **rainfall_gated** (default) — the recalibrated model. Rainfall is the
  *trigger*, susceptibility the *amplifier*: each of a barangay's
  susceptibility zones scores `rainfall_hazard × susceptibility_value`, and the
  barangay's headline number aggregates those zones (mean by default). No rain
  → no risk, no matter how high the susceptibility map is.
- **weighted_sum** (legacy) — additive `Σ wᵢ·valueᵢ` with weight
  redistribution when a factor's input is unavailable. Kept for back-compat and
  validation comparison.
"""

from __future__ import annotations

from dataclasses import dataclass

from risk_score.constants import (
    COMBINATION_RAINFALL_GATED,
    FACTOR_RAINFALL,
    FACTOR_SUSCEPTIBILITY,
    SCORE_MAX,
    ZONE_AGG_AREA_WEIGHTED,
    ZONE_AGG_MAX,
    RiskCategory,
)
from risk_score.models import RiskConfig

from .factors import DEFAULT_FACTORS, FactorInput, RiskFactor


@dataclass(frozen=True)
class ScoredResult:
    score: float  # 0-100
    category: RiskCategory
    breakdown: dict
    is_degraded: bool


class RiskEngine:
    def __init__(self, config: RiskConfig, factors: list[RiskFactor]):
        self.config = config
        self.factors = factors

    @classmethod
    def from_active_config(cls, factors: list[RiskFactor] | None = None) -> "RiskEngine":
        return cls(RiskConfig.get_active(), factors or DEFAULT_FACTORS)

    def score(self, data: FactorInput) -> ScoredResult:
        if self.config.combination_mode == COMBINATION_RAINFALL_GATED:
            return self._score_gated(data)
        return self._score_weighted(data)

    # --- rainfall-gated (default) ---------------------------------------
    def _score_gated(self, data: FactorInput) -> ScoredResult:
        rainfall = self._factor(FACTOR_RAINFALL)
        rain = rainfall.evaluate(data) if rainfall else None

        # No usable rainfall trigger -> cannot assert a flood risk. Score 0 but
        # flag degraded so a data outage surfaces via monitoring, not as a false
        # "all calm" that looks identical to genuinely dry weather.
        if rain is None or not rain.available:
            return ScoredResult(
                score=0.0,
                category=RiskCategory.LOW,
                breakdown={
                    FACTOR_RAINFALL: _rain_breakdown(rain, available=False),
                    "zones": [],
                    "aggregation": self.config.zone_aggregation,
                },
                is_degraded=True,
            )

        zones = data.context.zones_for(data.barangay)
        if not zones:
            # No susceptibility geometry: fall back to rain-only, flagged degraded.
            value = rain.value
            return ScoredResult(
                score=value * SCORE_MAX,
                category=self.config.categorize(value * SCORE_MAX),
                breakdown={
                    FACTOR_RAINFALL: _rain_breakdown(rain, available=True),
                    "zones": [],
                    "aggregation": self.config.zone_aggregation,
                },
                is_degraded=True,
            )

        scored_zones = []
        for zone in zones:
            hazard = rain.value * zone["value"]
            zone_score = hazard * SCORE_MAX
            scored_zones.append(
                {
                    "level": zone["level"],
                    "susceptibility": round(zone["value"], 4),
                    "share": round(zone.get("share", 0.0), 4),
                    "hazard": round(hazard, 4),
                    "score": round(zone_score, 2),
                    "category": self.config.categorize(zone_score).value,
                }
            )

        composite = self._aggregate(scored_zones)
        score = composite * SCORE_MAX
        return ScoredResult(
            score=score,
            category=self.config.categorize(score),
            breakdown={
                FACTOR_RAINFALL: _rain_breakdown(rain, available=True),
                FACTOR_SUSCEPTIBILITY: {
                    "dominant_level": zones[0]["level"],
                    "zone_count": len(zones),
                },
                "zones": scored_zones,
                "aggregation": self.config.zone_aggregation,
            },
            is_degraded=False,
        )

    def _aggregate(self, scored_zones: list[dict]) -> float:
        """Collapse per-zone hazards (0-1) to one barangay hazard."""
        hazards = [z["hazard"] for z in scored_zones]
        mode = self.config.zone_aggregation
        if mode == ZONE_AGG_MAX:
            return max(hazards)
        if mode == ZONE_AGG_AREA_WEIGHTED:
            total = sum(z["share"] for z in scored_zones)
            if total > 0:
                return sum(z["hazard"] * z["share"] for z in scored_zones) / total
        return sum(hazards) / len(hazards)  # mean (default)

    # --- weighted sum (legacy) ------------------------------------------
    def _score_weighted(self, data: FactorInput) -> ScoredResult:
        weights = self.config.weights
        results = [f.evaluate(data) for f in self.factors]
        available = [r for r in results if r.available]

        total_weight = sum(weights.get(r.key, 0.0) for r in available)
        composite = 0.0
        if total_weight > 0:
            for r in available:
                composite += r.value * (weights.get(r.key, 0.0) / total_weight)

        breakdown = {
            r.key: {
                "value": round(r.value, 4),
                "raw_weight": weights.get(r.key, 0.0),
                "available": r.available,
                "detail": r.detail,
            }
            for r in results
        }

        score = composite * SCORE_MAX
        return ScoredResult(
            score=score,
            category=self.config.categorize(score),
            breakdown=breakdown,
            is_degraded=any(not r.available for r in results),
        )

    def _factor(self, key: str) -> RiskFactor | None:
        return next((f for f in self.factors if getattr(f, "key", None) == key), None)


def _rain_breakdown(rain, available: bool) -> dict:
    return {
        "value": round(rain.value, 4) if rain else 0.0,
        "available": available,
        "detail": rain.detail if rain else {"reason": "no rainfall reading"},
    }
