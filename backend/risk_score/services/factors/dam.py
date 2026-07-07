"""Dam hazard: Pasonanca level as a proxy for downstream Tumaga river stage.

Hazard rises as the level climbs from normal toward critical, amplified by a
fast rate-of-rise and by active spilling. Its reach is *spatial*: a barangay's
share of that hazard decays with its distance to the river corridor, falling to
zero past the dam's influence radius. When distance hasn't been computed yet we
fall back to the coarse downstream flag.
"""

from risk_score.constants import FACTOR_DAM
from risk_score.services.normalization import clamp

from .base import FactorInput, FactorResult

# A rise of this many metres/hour counts as maximal rate hazard.
RISE_FULL_HAZARD_M_PER_HR = 0.5
# Fallback shares used only when a barangay's distance-to-river is unknown.
FALLBACK_DOWNSTREAM_SHARE = 1.0
FALLBACK_UPSTREAM_SHARE = 0.15
# Influence radius fallback (km) if the dam predates the geometry fields.
DEFAULT_INFLUENCE_RADIUS_KM = 8.0


def proximity_share(distance_km: float, radius_km: float) -> float:
    """Linear falloff: 1.0 at the corridor, 0.0 at/beyond the influence radius."""
    if radius_km <= 0:
        return 0.0
    return clamp(1.0 - distance_km / radius_km)


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

        distance_km = getattr(data.barangay, "distance_to_river_km", None)
        radius_km = getattr(dam, "influence_radius_km", None) or DEFAULT_INFLUENCE_RADIUS_KM
        if distance_km is not None:
            share = proximity_share(distance_km, radius_km)
        else:
            share = (
                FALLBACK_DOWNSTREAM_SHARE
                if data.barangay.is_downstream
                else FALLBACK_UPSTREAM_SHARE
            )
        hazard *= share

        return FactorResult(
            self.key,
            hazard,
            detail={
                "water_level": reading.water_level,
                "level_ratio": round(level_ratio, 4),
                "is_spilling": reading.is_spilling,
                "rate_of_change": reading.rate_of_change,
                "is_downstream": data.barangay.is_downstream,
                "distance_to_river_km": distance_km,
                "influence_radius_km": radius_km,
                "proximity_share": round(share, 4),
            },
        )
