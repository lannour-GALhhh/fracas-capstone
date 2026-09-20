"""Susceptibility hazard: authoritative flood-susceptibility hazard map, max-aggregated per barangay."""

from risk_score.constants import FACTOR_SUSCEPTIBILITY

from .base import FactorInput, FactorResult


class SusceptibilityFactor:
    key = FACTOR_SUSCEPTIBILITY

    def evaluate(self, data: FactorInput) -> FactorResult:
        info = data.context.susceptibility_for(data.barangay)
        if info is None:
            return FactorResult(self.key, 0.0, available=False, detail={"reason": "no susceptibility data"})
        return FactorResult(
            self.key,
            info["value"],
            detail={
                "dominant_level": info["level"],
                "zone_count": info["zone_count"],
                "levels": info.get("levels", {}),
            },
        )
