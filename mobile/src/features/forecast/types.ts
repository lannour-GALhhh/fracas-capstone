/** PAGASA rainfall-warning bands, as returned by GET /api/rainfall/forecast/. */
export type ForecastBand = 'none' | 'yellow' | 'orange' | 'red'

export interface ForecastHour {
    /** Start of the hour, ISO-8601 UTC. */
    start: string
    /** Hours from now (up to 11 PM tomorrow, local). Hours 1-4 are covered by the risk score. */
    lead_hours: number
    mm_hr: number
    /** Chance of rain (%), or null when the model has none. */
    probability: number | null
    band: ForecastBand
}

export interface ForecastSummary {
    /** First heavy hour beyond the risk score's 4 h window, if any. */
    first_heavy: ForecastHour | null
    peak: ForecastHour | null
    total_mm: number
}

export interface RainfallForecast {
    barangay: number
    name: string
    generated_at: string
    /** Hours at or below this lead are covered by the risk score. */
    warning_hours: number
    hours: ForecastHour[]
    summary: ForecastSummary
}
