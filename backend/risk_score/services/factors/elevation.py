"""Static vulnerability: terrain elevation, refined by hazard-map susceptibility.

Lower-lying barangays are more flood-prone (inverse of elevation percentile).
When a flood-susceptibility rating is available it's blended in equally;
otherwise elevation alone is used.
"""

from risk_score.constants import FACTOR_VULNERABILITY
from risk_score.services.normalization import clamp, normalize_position

from .base import FactorInput, FactorResult


class ElevationVulnerabilityFactor:
    key = FACTOR_VULNERABILITY

    def evaluate(self, data: FactorInput) -> FactorResult:
        barangay = data.barangay
        height = barangay.land_height_mean
        bounds = data.context.elevation_bounds
        if height is None or bounds is None:
            return FactorResult(self.key, 0.0, available=False, detail={"reason": "no elevation data"})

        low, high = bounds
        elevation_vuln = 1.0 - normalize_position(height, low, high)

        susceptibility = barangay.flood_susceptibility
        if susceptibility is not None:
            value = clamp(0.5 * elevation_vuln + 0.5 * susceptibility)
        else:
            value = elevation_vuln

        return FactorResult(
            self.key,
            value,
            detail={
                "land_height_mean": height,
                "elevation_vulnerability": round(elevation_vuln, 4),
                "flood_susceptibility": susceptibility,
            },
        )
