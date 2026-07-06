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

/** Payload for creating/updating an evacuation center. */
export interface EvacuationWrite {
    name: string
    capacity?: number | null
    contact?: string
    is_active?: boolean
    latitude: number
    longitude: number
}

export type HotspotSeverity = 'low' | 'medium' | 'high'

/** Properties on each flood-hotspot GeoJSON feature. */
export interface HotspotProperties {
    id: number
    name: string
    radius_m: number
    severity: HotspotSeverity
    description: string
    is_active: boolean
    barangay: number | null
    barangay_name: string | null
}

export type HotspotCollection = FeatureCollection<Point, HotspotProperties>

/** Payload for creating/updating a flood hotspot. */
export interface HotspotWrite {
    name: string
    radius_m?: number
    severity?: HotspotSeverity
    description?: string
    is_active?: boolean
    latitude: number
    longitude: number
}

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

/** Imperative handle a POI layer exposes to its parent: start placing a new POI. */
export interface PoiLayerHandle {
    startAdd: () => void
}

export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}
