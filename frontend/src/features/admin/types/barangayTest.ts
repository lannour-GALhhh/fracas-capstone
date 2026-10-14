import type { RiskCategory } from '@/features/gis/types/api'

export type TestAggregation = '' | 'area_weighted' | 'max' | 'mean'

/** Form values for POST /api/admin/barangay-test/. */
export interface BarangayTestInput {
    barangay: number
    file: File
    /** Local `YYYY-MM-DDTHH:mm`; blank = use the CSV's marker column. */
    floodAt: string
    hoursBefore: number
    hoursAfter: number
    minCategory: Exclude<RiskCategory, 'low'>
    aggregation: TestAggregation
    forecastLookahead: boolean
}

/** One scored hour of the uploaded series. */
export interface BarangayTestPoint {
    time: string
    rain_mm: number
    accumulated_24hr: number
    score: number
    category: RiskCategory
    flagged: boolean
    in_window: boolean
    is_mark: boolean
    /** First 23 hours of the CSV: the 24h rainfall total is still incomplete. */
    partial_history: boolean
}

/** Mirrors risk_score.services.series_test.run_series_test. */
export interface BarangayTestResponse {
    barangay: { id: number; name: string }
    config: { name: string; aggregation: string; thresholds: Record<string, number> }
    params: {
        mark: string
        window_start: string
        window_end: string
        hours_before: number
        hours_after: number
        min_category: string
        forecast_lookahead: boolean
        score_needed: number
    }
    result: {
        success: boolean
        first_detection_at: string | null
        /** Hours the system flagged ahead of the mark (positive = early). */
        lead_hours: number | null
        peak_score_in_window: number | null
        peak_category_in_window: RiskCategory | null
        peak_rain_mm_hr_in_window: number
        peak_accumulated_24hr_in_window: number
        flagged_hours_outside_window: number
        hours_scored: number
    }
    series: BarangayTestPoint[]
    warnings: string[]
}
