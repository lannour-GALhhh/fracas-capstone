import type { FeatureCollection, Point } from 'geojson'

export interface EvacuationContact {
    id?: number
    label: string
    phone: string
}

/** One photo in the form's ordered list: a saved image (`id`) or a newly picked `file`. */
export interface CenterPhoto {
    key: string
    url: string
    id?: number
    file?: File
}

export interface EvacuationImage {
    id: number
    image: string
    uploaded_at: string
}

/** Properties on each evacuation-center GeoJSON feature. */
export interface EvacuationProperties {
    id: number
    name: string
    capacity: number | null
    capacity_unit: string
    /** First contact's number — kept for older clients; prefer `contacts`. */
    contact: string
    contacts: EvacuationContact[]
    images: EvacuationImage[]
    is_active: boolean
    barangay: number | null
    barangay_name: string | null
    /** ISO timestamp when archived; null for live centers. */
    archived_at: string | null
}

export type EvacuationCollection = FeatureCollection<Point, EvacuationProperties>

/** Operator write payload for POST/PATCH /api/evacuation/centers/. */
export interface EvacuationInput {
    name: string
    latitude: number
    longitude: number
    capacity: number | null
    capacity_unit: string
    contacts: EvacuationContact[]
    is_active: boolean
}

export type PoiKind = 'evacuation' | 'hotspot'
export type PoiAction = 'created' | 'updated' | 'moved' | 'deleted' | 'archived' | 'restored'

/** One row from GET /api/poi/logs/. */
export interface PoiLog {
    id: number
    poi_type: PoiKind
    poi_id: number
    name: string
    action: PoiAction
    longitude: number | null
    latitude: number | null
    detail: Record<string, unknown>
    editor: number | null
    editor_name: string | null
    editor_username: string | null
    created_at: string
}

export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}
