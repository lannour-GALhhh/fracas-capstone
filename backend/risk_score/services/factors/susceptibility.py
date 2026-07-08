"""Susceptibility hazard: authoritative flood-susceptibility hazard map.

Replaces the old dam-proxy + elevation-percentile blend. The value comes
straight from the ZCDRRMO/DOST/PAGASA (Manila Observatory) hazard
classification, worst-case (max()) aggregated per barangay across its
susceptibility zones — see `barangays.services.dominant_susceptibility_by_barangay`.
"""

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
            detail={"dominant_level": info["level"], "zone_count": info["zone_count"]},
        )
