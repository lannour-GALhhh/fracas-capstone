import type { RiskCategory, SusceptibilityLevel } from '@/features/gis/types'

/** Who opened the evacuation. */
export type EvacuationTrigger = 'automated' | 'operator'

/** A zone under evacuation, scored as of the declaration. Empty list = the whole barangay. */
export interface EvacuationZone {
    level: SusceptibilityLevel
    score: number
    category: RiskCategory
}

/** The resident's own reported status within an evacuation. */
export type EvacuationStatusValue = 'notified' | 'moving' | 'safe' | 'unaccounted'

/** How a resident reached safety — mirrors the backend `ResolvedVia`. */
export type ResolvedVia = 'center' | 'left_zone'

/** One row from GET /api/evacuation/evacuations/for-me/ (resident-facing).
 * Deliberately slim — the resident sees only their own barangays and their own
 * status, never the roster or aggregate counts (those stay operator-only). */
export interface MyEvacuation {
    evacuation_id: number
    barangay_id: number
    barangay_name: string
    trigger: EvacuationTrigger
    zones: EvacuationZone[]
    opened_at: string
    my_status: EvacuationStatusValue | null
}

/** Body for POST /api/evacuation/report/ — this device's status transition. */
export interface EvacuationReport {
    evacuation_id: number
    status: 'moving' | 'safe'
    resolved_via?: ResolvedVia
    center_id?: number | null
    lat?: number
    lng?: number
}
