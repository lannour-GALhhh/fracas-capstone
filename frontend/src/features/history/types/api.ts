import type { RiskCategory } from '@/features/gis/types/api'

/** Recorded severity of a flood event (mirrors backend FloodSeverity). */
export type FloodSeverity = 'minor' | 'moderate' | 'major'

/** How the event entered the system (mirrors backend SourceKind). */
export type FloodSourceKind = 'manual' | 'auto'

/** Who reported the event (mirrors backend SourceType). */
export type FloodSourceType = 'operator' | 'third_party'

/** Lean operator shape for the source picker (GET /api/operators/). */
export interface Operator {
    id: number
    name: string
}

/** DRF page envelope. */
export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

/** One photo attached to an evidence report. */
export interface FloodEventReportImage {
    id: number
    image: string // absolute URL
    caption: string
    uploaded_at: string
}

/** An operator-authored evidence report (GET/POST /flood-events/:id/reports/). */
export interface FloodEventReport {
    id: number
    flood_event: number
    reporter: number | null
    reporter_name: string | null
    description: string
    occurred_at: string
    created_at: string
    images: FloodEventReportImage[]
}

/** One row of GET /api/flood-events/ (mirrors FloodEventSerializer). */
export interface FloodEvent {
    id: number
    barangay: number
    barangay_name: string
    occurred_at: string
    ended_at: string | null
    severity: FloodSeverity
    water_depth_m: number | null
    source: string
    source_type: FloodSourceType
    reported_by_name: string | null
    notes: string
    source_kind: FloodSourceKind
    is_confirmed: boolean
    confirmed_by_name: string | null
    is_resolved: boolean
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
    duration_hours: number | null
    summary: string
    people_affected: number | null
    people_evacuated: number | null
    reported_by: number | null
    confirmed_at: string | null
    deleted_at: string | null
    timeline: FloodTimelineEntry[]
    telemetry: FloodTelemetry
}

/** One audit-trail row from GET /api/flood-events/:id/changes/. */
export type FloodChangeAction =
    | 'created'
    | 'updated'
    | 'confirmed'
    | 'resolved'
    | 'deleted'
    | 'restored'

export interface FloodEventChange {
    id: number
    editor_name: string | null
    action: FloodChangeAction
    field: string
    old_value: string
    new_value: string
    changed_at: string
}

/** Server-side filters for the list. `page` drives DRF pagination. */
export interface FloodEventFilters {
    barangay?: number
    severity?: FloodSeverity
    /** Inclusive ISO date (YYYY-MM-DD) lower bound on occurred_at. */
    occurred_after?: string
    /** Inclusive ISO date (YYYY-MM-DD) upper bound on occurred_at. */
    occurred_before?: string
    page?: number
}

/** One timeline row in a write payload. */
export interface FloodTimelineInput {
    occurred_at: string
    title: string
    description?: string
}

/** POST/PATCH body for creating or editing a flood event (mirrors the write serializer). */
export interface FloodEventInput {
    barangay: number
    occurred_at: string
    ended_at?: string | null
    severity: FloodSeverity
    water_depth_m?: number | null
    summary?: string
    people_affected?: number | null
    people_evacuated?: number | null
    source?: string
    source_type: FloodSourceType
    reported_by?: number | null
    notes?: string
    timeline: FloodTimelineInput[]
}
