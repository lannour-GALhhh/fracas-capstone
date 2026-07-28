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
