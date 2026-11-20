"""Rainfall hazard: the larger of peak intensity and intensity-gated saturation (24h observed + discounted forecast load)."""

from risk_score.constants import FACTOR_RAINFALL, HOURLY_BASE_HORIZON, SATURATION_GATE_MM_HR
from risk_score.services.horizon import active_horizon, forecast_load, hourly_series, weighted_peak
from risk_score.services.normalization import clamp, normalize_accumulation, normalize_rainfall

from .base import FactorInput, FactorResult


class RainfallFactor:
    key = FACTOR_RAINFALL

    def evaluate(self, data: FactorInput) -> FactorResult:
        r = data.rainfall
        if r is None:
            return FactorResult(self.key, 0.0, available=False, detail={"reason": "no rainfall reading"})

        # Only the hourly series drives the score; the 15-minute fields are for display.
        series = hourly_series(r)
        # Original logic unless the active config enables the forecast horizon: peak of the
        # current + next four hours, saturation from the observed 24h alone.
        if getattr(data.context, "forecast_horizon", False):
            horizon = active_horizon(series)
            load = forecast_load(series, horizon)
        else:
            horizon = HOURLY_BASE_HORIZON
            load = 0.0
        peak_intensity = weighted_peak(series, horizon)

        intensity = normalize_rainfall(peak_intensity, getattr(data.context, "rainfall_curve", None))
        # Saturation = what already fell (24h) plus the discounted forecast rain over the active
        # horizon: every forecast hour adds to the ground's load, not just the wettest one.
        saturation_mm = r.accumulated_24hr + load
        saturation = normalize_accumulation(saturation_mm, getattr(data.context, "accumulation_curve", None))
        # Saturation is the strongest flood signal, but only while it is actually raining: scale
        # it by how close the peak intensity is to the gate so light drizzle can't saturate it.
        # The gate also remembers the last 6 h (mean intensity), so saturation fades over a few
        # hours after a storm instead of dropping to zero the moment the rain stops.
        recent_mean = getattr(r, "accumulated_6hr", 0.0) / 6.0
        gate_intensity = max(peak_intensity, recent_mean)
        gate = clamp(gate_intensity / SATURATION_GATE_MM_HR) if SATURATION_GATE_MM_HR > 0 else 1.0
        effective_saturation = saturation * gate
        value = clamp(max(intensity, effective_saturation))

        return FactorResult(
            self.key,
            value,
            detail={
                "peak_intensity_mm_hr": peak_intensity,
                "accumulated_24hr_mm": r.accumulated_24hr,
                "horizon_hours": horizon,
                "forecast_load_mm": round(load, 2),
                "saturation_mm": round(saturation_mm, 2),
                "intensity_hazard": round(intensity, 4),
                "saturation_hazard": round(saturation, 4),
                "saturation_gate": round(gate, 4),
            },
        )
