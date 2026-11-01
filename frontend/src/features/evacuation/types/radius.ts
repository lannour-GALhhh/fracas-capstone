/** Resident-visible fields of a point + radius evacuation. */
export interface RadiusEvacuation {
    id: number
    name: string
    center: { lat: number; lng: number }
    radius_m: number
    /** Barangays the circle touched when it was declared (frozen record). */
    barangays: { id: number; name: string }[]
    origin_barangay: { id: number; name: string } | null
    opened_at: string
    my_status: 'inside' | 'safe' | null
    /** Operator-only tallies. */
    inside?: number
    safe?: number
}

export interface RadiusEvacuationHistoryEntry extends Omit<RadiusEvacuation, 'my_status'> {
    closed_at: string
    final_inside: number | null
    final_safe: number | null
}

export interface DeclareRadiusInput {
    lat: number
    lng: number
    radius_m: number
    name?: string
}

export const MIN_RADIUS_M = 50
export const MAX_RADIUS_M = 10_000
