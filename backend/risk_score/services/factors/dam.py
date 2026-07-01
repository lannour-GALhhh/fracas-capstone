"""Dam hazard: Pasonanca level as a proxy for downstream Tumaga river stage.

Hazard rises as the level climbs from normal toward critical, amplified by a
fast rate-of-rise and by active spilling. It threatens downstream (Tumaga
corridor) barangays; upstream barangays feel only an attenuated share.
"""

from risk_score.constants import FACTOR_DAM
from risk_score.services.normalization import clamp

from .base import FactorInput, FactorResult

# A rise of this many metres/hour counts as maximal rate hazard.
RISE_FULL_HAZARD_M_PER_HR = 0.5
# Share of dam hazard felt by barangays not downstream of the dam.
UPSTREAM_ATTENUATION = 0.15


class DamFactor:
    key = FACTOR_DAM

    def evaluate(self, data: FactorInput) -> FactorResult:
        dam = data.context.dam
        reading = data.context.dam_reading
        if dam is None or reading is None:
            return FactorResult(self.key, 0.0, available=False, detail={"reason": "no dam reading"})

        span = dam.critical_level - dam.normal_level
        level_ratio = clamp((reading.water_level - dam.normal_level) / span) if span > 0 else 0.0
        rise_hazard = clamp((reading.rate_of_change or 0.0) / RISE_FULL_HAZARD_M_PER_HR)
        spill = 1.0 if reading.is_spilling else 0.0

        # Spilling is at least as severe as a full level ratio; rate adds urgency.
        base = max(level_ratio, spill)
        hazard = clamp(0.7 * base + 0.3 * rise_hazard)

        if not data.barangay.is_downstream:
            hazard *= UPSTREAM_ATTENUATION

        return FactorResult(
            self.key,
            hazard,
            detail={
                "water_level": reading.water_level,
                "level_ratio": round(level_ratio, 4),
                "is_spilling": reading.is_spilling,
                "rate_of_change": reading.rate_of_change,
                "is_downstream": data.barangay.is_downstream,
            },
        )
