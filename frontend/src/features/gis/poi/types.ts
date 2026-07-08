import type { FeatureCollection, Point } from 'geojson'

/** Properties on each evacuation-center GeoJSON feature. */
export interface EvacuationProperties {
    id: number
    name: string
    capacity: number | null
    contact: string
    is_active: boolean
    barangay: number | null
    barangay_name: string | null
}

export type EvacuationCollection = FeatureCollection<Point, EvacuationProperties>

export type PoiKind = 'evacuation' | 'hotspot'
export type PoiAction = 'created' | 'updated' | 'moved' | 'deleted'

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
