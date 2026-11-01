/** A point + radius evacuation (GET /api/evacuation/radius/). */
export interface RadiusEvacuation {
    id: number
    name: string
    center: { lat: number; lng: number }
    radius_m: number
    barangays: { id: number; name: string }[]
    opened_at: string
    /** The resident's own recorded status; null until they've been inside. */
    my_status: 'inside' | 'safe' | null
}

/** Body for POST /api/evacuation/radius/report/. */
export interface RadiusReport {
    evacuation_id: number
    status: 'inside' | 'safe'
    lat?: number
    lng?: number
}
