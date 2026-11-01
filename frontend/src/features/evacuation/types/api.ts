import type { RiskCategory, SusceptibilityLevel } from '@/features/gis/types/api'

/** A zone under evacuation, scored as of the declaration. */
export interface EvacuationZone {
    level: SusceptibilityLevel
    score: number
    category: RiskCategory
}

/** What opened an evacuation: the automated pipeline or an operator ping. */
export type EvacuationTrigger = 'automated' | 'operator'

/** Barangay-based (zones of one barangay) or point-based (centre + radius). */
export type EvacuationType = 'barangay' | 'point'

/** One active evacuation's live aggregate. */
export interface EvacuationAggregate {
    evacuation_id: number
    barangay: { id: number; name: string }
    trigger: EvacuationTrigger
    zones: EvacuationZone[]
    opened_at: string
    roster: number
    safe: number
    moving: number
    notified: number
    unaccounted: number
    updated_at: string
}

/** One closed evacuation; `final_*` counts are null when never recorded. */
export interface EvacuationHistoryEntry {
    id: number
    type: EvacuationType
    /** Point-based rows only. */
    center?: { lat: number; lng: number }
    radius_m?: number
    affected_barangays?: { id: number; name: string }[]
    /** For point-based rows: the barangay containing the origin point. */
    barangay: { id: number | null; name: string }
    trigger: EvacuationTrigger
    /** Operator who pinged it; `null` for an automated run. */
    triggered_by_name: string | null
    opened_at: string
    closed_at: string
    duration_seconds: number | null
    final_roster: number | null
    final_safe: number | null
    final_moving: number | null
    final_unaccounted: number | null
}

/** Query params for the history archive. Dates are `YYYY-MM-DD`. */
export interface EvacuationHistoryFilters {
    page?: number
    /** Comma-separated barangay ids. */
    barangay?: string
    trigger?: EvacuationTrigger
    closed_after?: string
    closed_before?: string
    type?: EvacuationType
}

/** DRF page envelope. */
export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

/** POST /evacuation/evacuations/ response. */
export interface PingResult {
    evacuation_id: number | null
    created: boolean
    /** True when no zone of the barangay scores High or Critical. */
    skipped?: boolean
}

/** POST /evacuation/evacuations/<id>/stand-down/ response (the "mark safe" action). */
export interface MarkSafeResult {
    evacuation_id: number
    status: string
}
