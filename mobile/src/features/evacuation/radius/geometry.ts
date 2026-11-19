import distance from '@turf/distance'
import type { Feature, FeatureCollection, Polygon } from 'geojson'

import type { LngLat } from '@/features/gis/utils/geo'

import type { EvacuationCenterCollection } from '@/features/gis/types'

import type { RadiusEvacuation } from './types'

/** Metres past the edge before a resident counts as having left (GPS jitter guard). */
export const EXIT_BUFFER_M = 30

const EARTH_RADIUS_M = 6_371_008.8

/** Great-circle distance in metres from a point to the evacuation centre. */
export const distanceToCenterM = ({ lng, lat }: LngLat, evac: RadiusEvacuation): number =>
    distance([lng, lat], [evac.center.lng, evac.center.lat], { units: 'meters' })

export const isInside = (point: LngLat, evac: RadiusEvacuation): boolean =>
    distanceToCenterM(point, evac) <= evac.radius_m

export const hasLeft = (point: LngLat, evac: RadiusEvacuation): boolean =>
    distanceToCenterM(point, evac) > evac.radius_m + EXIT_BUFFER_M

/** Circle polygons for every evacuation, ready for a map fill/line layer. */
export const radiusCollection = (
    evacs: Pick<RadiusEvacuation, 'id' | 'radius_m' | 'center'>[],
    steps = 64,
): FeatureCollection<Polygon, { id: number }> => ({
    type: 'FeatureCollection',
    features: evacs.map((e): Feature<Polygon, { id: number }> => {
        const dLat = (e.radius_m / EARTH_RADIUS_M) * (180 / Math.PI)
        const dLng = dLat / Math.cos((e.center.lat * Math.PI) / 180)
        const ring: [number, number][] = []
        for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * 2 * Math.PI
            ring.push([e.center.lng + dLng * Math.cos(a), e.center.lat + dLat * Math.sin(a)])
        }
        return {
            type: 'Feature',
            properties: { id: e.id },
            geometry: { type: 'Polygon', coordinates: [ring] },
        }
    }),
})

/** Default geofence radius (m) for centers that don't carry one (older/offline data). */
const DEFAULT_CENTER_RADIUS_M = 200

/** Circle polygons for each active center's auto-evacuation radius. */
export const centerRadiusCollection = (
    centers: EvacuationCenterCollection | undefined,
): FeatureCollection<Polygon, { id: number }> =>
    radiusCollection(
        (centers?.features ?? []).map((f) => ({
            id: f.properties.id,
            radius_m: f.properties.radius_m ?? DEFAULT_CENTER_RADIUS_M,
            center: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] },
        })),
    )
