import type { BarangayRisk } from '../types/api'

const QUARTER_MS = 15 * 60_000

/**
 * Rainfall for the 15-minute step containing `now`, not the step the reading was recorded in.
 *
 * `series` is [current, +15min, … +240min] anchored on the step `recordedAt` falls in. If the
 * reading is older than a quarter hour, the matching later step is the real "current" value.
 * Without a timestamp/series it falls back to `current`; past the 4 h window it returns null.
 */
export function currentFromSeries(
    current: number | null,
    series: (number | null)[] | null | undefined,
    recordedAt: string | null | undefined,
    now: number = Date.now(),
): number | null {
    if (!recordedAt || !series) return current
    const steps = Math.floor(now / QUARTER_MS) - Math.floor(new Date(recordedAt).getTime() / QUARTER_MS)
    if (steps <= 0) return current
    return series[steps] ?? null // beyond the forecast window the data is too stale to trust
}

export function currentRainfallAt(data: BarangayRisk, now: number = Date.now()): number | null {
    const series = [
        data.current_rainfall,
        data.rainfall_forecast_15min,
        data.rainfall_forecast_30min,
        data.rainfall_forecast_45min,
        data.rainfall_forecast_60min,
        data.rainfall_forecast_75min,
        data.rainfall_forecast_90min,
        data.rainfall_forecast_105min,
        data.rainfall_forecast_120min,
        data.rainfall_forecast_135min,
        data.rainfall_forecast_150min,
        data.rainfall_forecast_165min,
        data.rainfall_forecast_180min,
        data.rainfall_forecast_195min,
        data.rainfall_forecast_210min,
        data.rainfall_forecast_225min,
        data.rainfall_forecast_240min,
    ]
    return currentFromSeries(data.current_rainfall, series, data.recorded_at, now)
}
