"""Rainfall hazard: peak short-term intensity blended with saturation."""

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
            r.forecast_strength_15min,
            r.forecast_strength_30min,
            r.forecast_strength_45min,
            r.forecast_strength_60min,
            r.forecast_strength_75min,
            r.forecast_strength_90min,
            r.forecast_strength_105min,
            r.forecast_strength_120min,
            r.forecast_strength_135min,
            r.forecast_strength_150min,
            r.forecast_strength_165min,
            r.forecast_strength_180min,
            r.forecast_strength_195min,
            r.forecast_strength_210min,
            r.forecast_strength_225min,
            r.forecast_strength_240min,
        ]
        peak_forecast = max(forecasts)
        peak_intensity = max(r.current_rainfall_strength, peak_forecast)

        intensity = normalize_rainfall(peak_intensity, getattr(data.context, "rainfall_curve", None))
        saturation = normalize_accumulation(
            r.accumulated_24hr, getattr(data.context, "accumulation_curve", None)
        )
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
