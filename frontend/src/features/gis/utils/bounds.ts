import type { Position } from 'geojson'
import type { LngLatBoundsLike, Map as MapLibreMap } from 'maplibre-gl'
import type { BarangayGeometry, RiskFeatureCollection } from '../types/api'

/** [minLng, minLat, maxLng, maxLat] */
export type BBox = [number, number, number, number]

const extend = (box: BBox, [lng, lat]: Position): void => {
    if (lng < box[0]) box[0] = lng
    if (lat < box[1]) box[1] = lat
    if (lng > box[2]) box[2] = lng
    if (lat > box[3]) box[3] = lat
}

const eachPosition = (geometry: BarangayGeometry, fn: (p: Position) => void): void => {
    const rings = geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()
    rings.forEach((ring) => ring.forEach(fn))
}

const emptyBox = (): BBox => [Infinity, Infinity, -Infinity, -Infinity]
const isValid = (box: BBox): boolean => box[0] !== Infinity

/** Bounding box of one geometry, or null if it has no coordinates. */
export const geometryBounds = (geometry: BarangayGeometry): BBox | null => {
    const box = emptyBox()
    eachPosition(geometry, (p) => extend(box, p))
    return isValid(box) ? box : null
}

/** Bounding box covering every feature in the collection. */
export const collectionBounds = (collection: RiskFeatureCollection): BBox | null => {
    const box = emptyBox()
    collection.features.forEach((f) => eachPosition(f.geometry, (p) => extend(box, p)))
    return isValid(box) ? box : null
}

/** Bounds of the feature matching `id`. */
export const featureBoundsById = (
    collection: RiskFeatureCollection,
    id: number,
): BBox | null => {
    const feature = collection.features.find((f) => f.properties.id === id)
    return feature ? geometryBounds(feature.geometry) : null
}

/** Fits the map to `box`, padded on the right for the side panel. Shared
 * between the auto-fit-on-select behaviour and the manual "zoom to city" button. */
export const fitBox = (
    map: MapLibreMap,
    box: BBox,
    panelWidth: number,
    duration: number,
): void => {
    map.fitBounds(box as LngLatBoundsLike, {
        padding: { top: 64, bottom: 64, left: 64, right: 64 + panelWidth },
        maxZoom: 14,
        duration,
    })
}
