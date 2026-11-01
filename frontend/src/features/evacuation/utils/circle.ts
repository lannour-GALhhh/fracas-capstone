const EARTH_RADIUS_M = 6_371_008.8

/** GeoJSON polygon approximating a circle of `radiusM` metres around a point. */
export const circlePolygon = (lng: number, lat: number, radiusM: number, steps = 64) => {
    const latRad = (lat * Math.PI) / 180
    const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI)
    const dLng = dLat / Math.cos(latRad)
    const ring: [number, number][] = []
    for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * 2 * Math.PI
        ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)])
    }
    return { type: 'Polygon' as const, coordinates: [ring] }
}
