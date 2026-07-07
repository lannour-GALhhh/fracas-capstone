/** A closed ring of [lng, lat] approximating a circle of `radiusM` metres. */
export const circleRing = (
    lng: number,
    lat: number,
    radiusM: number,
    steps = 48,
): [number, number][] => {
    const earth = 6378137 // WGS84 semi-major axis, metres
    const dLat = (radiusM / earth) * (180 / Math.PI)
    const dLng = dLat / Math.cos((lat * Math.PI) / 180)
    const ring: [number, number][] = []
    for (let i = 0; i <= steps; i += 1) {
        const t = (i / steps) * 2 * Math.PI
        ring.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)])
    }
    return ring
}

export const SEVERITY_COLOR: Record<string, string> = {
    low: '#f59e0b',
    medium: '#f97316',
    high: '#ef4444',
}
