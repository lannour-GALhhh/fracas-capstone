import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import distance from '@turf/distance'
import type { Feature, FeatureCollection, GeoJsonProperties } from 'geojson'

import type {
    BarangayGeometry,
    EvacuationCenterFeature,
    RiskFeature,
    RiskFeatureCollection,
} from '../types'

/** A longitude/latitude pair (GeoJSON order). */
export interface LngLat {
    lng: number
    lat: number
}

/**
 * The polygon feature that contains this point (handles MultiPolygon rings +
 * holes). Generic over the feature properties so it works for both the joined
 * risk collection and the lean public boundaries used during registration.
 * Returns the first match, or null when the point is outside every feature.
 */
export const featureAt = <P extends GeoJsonProperties>(
    { lng, lat }: LngLat,
    features: FeatureCollection<BarangayGeometry, P> | null,
): Feature<BarangayGeometry, P> | null => {
    if (!features) return null
    for (const feature of features.features) {
        if (booleanPointInPolygon([lng, lat], feature)) return feature
    }
    return null
}

/** Which barangay (with risk joined) contains this point? */
export const findBarangayAt = (point: LngLat, features: RiskFeatureCollection | null): RiskFeature | null =>
    featureAt(point, features)

export interface NearestCenter {
    center: EvacuationCenterFeature
    distanceKm: number
}

/** The closest evacuation center to a point, with its great-circle distance. */
export const nearestCenter = (
    { lng, lat }: LngLat,
    centers: EvacuationCenterFeature[] | undefined,
): NearestCenter | null => {
    if (!centers?.length) return null
    let best: NearestCenter | null = null
    for (const center of centers) {
        const km = distance([lng, lat], center.geometry.coordinates, { units: 'kilometers' })
        if (!best || km < best.distanceKm) best = { center, distanceKm: km }
    }
    return best
}

/** Resolve the home barangay feature by name (case/space-insensitive). */
export const barangayByName = (
    features: RiskFeatureCollection | null,
    name: string | null | undefined,
): RiskFeature | null => {
    if (!features || !name) return null
    const target = name.trim().toLowerCase()
    if (!target) return null
    return features.features.find((f) => f.properties.name.trim().toLowerCase() === target) ?? null
}
