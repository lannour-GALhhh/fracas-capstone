"""Rainfall hazard: peak short-term intensity blended with saturation.

Leans cautious for early warning — takes the greater of raw intensity hazard
and an intensity+accumulation blend, so either torrential rain now or a
saturated multi-hour total raises the score.
"""

from risk_score.constants import FACTOR_RAINFALL
from risk_score.services.normalization import clamp, normalize_accumulation, normalize_rainfall

from .base import FactorInput, FactorResult


class RainfallFactor:
    key = FACTOR_RAINFALL

    def evaluate(self, data: FactorInput) -> FactorResult:
        r = data.rainfall
        if r is None:
            return FactorResult(self.key, 0.0, available=False, detail={"reason": "no rainfall reading"})

        forecasts = [
            r.forecast_strength_1hr,
            r.forecast_strength_2hr,
            r.forecast_strength_3hr,
            r.forecast_strength_4hr,
        ]
        peak_forecast = max(forecasts)
        peak_intensity = max(r.current_rainfall_strength, peak_forecast)

        intensity = normalize_rainfall(peak_intensity)
        saturation = normalize_accumulation(r.accumulated_24hr)
        value = clamp(max(intensity, 0.5 * intensity + 0.5 * saturation))

        return FactorResult(
            self.key,
            value,
            detail={
                "peak_intensity_mm_hr": peak_intensity,
                "accumulated_24hr_mm": r.accumulated_24hr,
                "intensity_hazard": round(intensity, 4),
                "saturation_hazard": round(saturation, 4),
            },
        )
