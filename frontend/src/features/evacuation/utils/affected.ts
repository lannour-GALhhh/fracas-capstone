import type { RiskFeatureCollection } from '@/features/gis/types/api'

const M_PER_DEG_LAT = 111_320

type Ring = number[][]

const pointInRing = (x: number, y: number, ring: Ring) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]
        const [xj, yj] = ring[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
}

/** Does the circle touch this polygon? (centre inside, or any edge within the radius) */
const circleTouchesPolygon = (rings: Ring[], lng: number, lat: number, radiusM: number) => {
    const kx = M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)
    const toM = ([x, y]: number[]): [number, number] => [(x - lng) * kx, (y - lat) * M_PER_DEG_LAT]
    if (pointInRing(lng, lat, rings[0]) && !rings.slice(1).some((h) => pointInRing(lng, lat, h)))
        return true
    for (const ring of rings) {
        for (let i = 0; i < ring.length - 1; i++) {
            const [ax, ay] = toM(ring[i])
            const [bx, by] = toM(ring[i + 1])
            const dx = bx - ax
            const dy = by - ay
            const len2 = dx * dx + dy * dy
            const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0
            if (Math.hypot(ax + t * dx, ay + t * dy) <= radiusM) return true
        }
    }
    return false
}

/** Barangays the circle touches — a live preview of what the server will record. */
export const affectedBarangays = (
    data: RiskFeatureCollection | null,
    lng: number,
    lat: number,
    radiusM: number,
): { id: number; name: string }[] =>
    (data?.features ?? [])
        .filter((f) => {
            const g = f.geometry
            const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
            return polys.some((rings) => circleTouchesPolygon(rings as Ring[], lng, lat, radiusM))
        })
        .map((f) => ({ id: f.properties.id, name: f.properties.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
