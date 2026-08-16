/** What opened an evacuation: the automated pipeline or an operator ping. */
export type EvacuationTrigger = 'automated' | 'operator'

/** One resident's reported status within an evacuation. */
export type EvacuationStatusValue = 'notified' | 'moving' | 'safe' | 'unaccounted'

/** How a resident resolved to safe. */
export type ResolvedVia = '' | 'center' | 'left_zone'

/**
 * One active evacuation's live aggregate (GET /evacuation/evacuations/active/).
 * The denominator `roster` is the barangay's subscriber count; `unaccounted` is
 * derived server-side as `roster − reporters`.
 */
export interface EvacuationAggregate {
    evacuation_id: number
    barangay: { id: number; name: string }
    trigger: EvacuationTrigger
    opened_at: string
    roster: number
    safe: number
    moving: number
    unaccounted: number
    updated_at: string
}

/** One row of the operator drill-down (GET /evacuation/evacuations/<id>/statuses/). */
export interface EvacueeStatus {
    id: number
    user: { id: number; label: string }
    status: EvacuationStatusValue
    resolved_via: ResolvedVia
    center: number | null
    center_name: string | null
    last_lat: number | null
    last_lng: number | null
    updated_at: string
}

/**
 * One stood-down evacuation (GET /evacuation/evacuations/history/).
 * The `final_*` counts are the aggregate frozen at stand-down — they survive the
 * retention purge of the per-resident rows. `null` means "never recorded", which
 * is distinct from a genuine zero, so render it as an em dash, not a 0.
 */
export interface EvacuationHistoryEntry {
    id: number
    barangay: { id: number; name: string }
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
    barangay?: number
    trigger?: EvacuationTrigger
    closed_after?: string
    closed_before?: string
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
    evacuation_id: number
    created: boolean
}

/** POST /evacuation/evacuations/<id>/stand-down/ response. */
export interface StandDownResult {
    evacuation_id: number
    status: string
}
