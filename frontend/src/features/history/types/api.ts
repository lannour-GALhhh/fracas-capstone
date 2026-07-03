import type { RiskCategory } from '@/features/gis/types/api'

/** Recorded severity of a flood event (mirrors backend FloodSeverity). */
export type FloodSeverity = 'minor' | 'moderate' | 'major'

/** DRF page envelope. */
export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

/** One row of GET /api/flood-events/ (mirrors FloodEventSerializer). */
export interface FloodEvent {
    id: number
    barangay: number
    barangay_name: string
    occurred_at: string
    severity: FloodSeverity
    water_depth_m: number | null
    source: string
    notes: string
}

/** One step in an event's response timeline. */
export interface FloodTimelineEntry {
    id: number
    occurred_at: string
    title: string
    description: string
}

/** Peak rainfall around the event (null when no reading in the window). */
export interface RainfallTelemetry {
    peak_intensity: number
    peak_accumulation_24hr: number
    recorded_at: string
}

/** Peak dam level around the event (null when no reading in the window). */
export interface DamTelemetry {
    peak_level: number
    is_spilling: boolean
    turbidity: number | null
    recorded_at: string
}

/** Peak computed hazard around the event (null when no score in the window). */
export interface RiskTelemetry {
    peak_score: number
    category: RiskCategory
    breakdown: Record<string, unknown>
    computed_at: string
}

/** Derived telemetry block on the detail response (`telemetry`). */
export interface FloodTelemetry {
    window_hours: number
    rainfall: RainfallTelemetry | null
    dam: DamTelemetry | null
    risk: RiskTelemetry | null
    location: [number, number] // [lon, lat]
}

/** GET /api/flood-events/:id/ (mirrors FloodEventDetailSerializer). */
export interface FloodEventDetail extends FloodEvent {
    ended_at: string | null
    duration_hours: number | null
    summary: string
    people_affected: number | null
    people_evacuated: number | null
    timeline: FloodTimelineEntry[]
    telemetry: FloodTelemetry
}

/** Server-side filters for the list. `page` drives DRF pagination. */
export interface FloodEventFilters {
    barangay?: number
    severity?: FloodSeverity
    page?: number
}
