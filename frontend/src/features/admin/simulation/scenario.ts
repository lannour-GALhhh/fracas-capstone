import type { RiskFeatureCollection } from '@/features/gis/types/api'
import { geometryBounds } from '@/features/gis/utils/bounds'
import type { SimulationParams, SimulationRequest } from '../types/simulation'

/** Dry hours before the storm so the timeline starts calm. */
export const LEAD_HOURS = 3
/** Dry hours after it, so the 6h/24h tails (and the risk falling back) are visible. */
export const TAIL_HOURS = 6

export const totalHours = (durationHours: number) => LEAD_HOURS + durationHours + TAIL_HOURS
/** Hour index of the storm's peak. */
export const peakHour = (durationHours: number) => LEAD_HOURS + Math.floor(durationHours / 2)

/** Small deterministic PRNG so a seed reproduces the same cluster and variation. */
export const mulberry32 = (seed: number) => {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

interface Centre {
    id: number
    lng: number
    lat: number
}

const centres = (data: RiskFeatureCollection): Centre[] =>
    data.features.flatMap((f) => {
        const box = geometryBounds(f.geometry)
        return box ? [{ id: f.properties.id, lng: (box[0] + box[2]) / 2, lat: (box[1] + box[3]) / 2 }] : []
    })

/** The `size` barangays nearest the epicentre (itself first), with each one's 0–1 distance share. */
export const pickCluster = (
    data: RiskFeatureCollection,
    epicenterId: number | null,
    size: number,
    seed: number,
): { id: number; distance: number }[] => {
    const all = centres(data)
    if (all.length === 0) return []
    const rng = mulberry32(seed)
    const seedCentre = all.find((c) => c.id === epicenterId) ?? all[Math.floor(rng() * all.length)]
    const ranked = all
        .map((c) => ({ id: c.id, d: Math.hypot(c.lng - seedCentre.lng, c.lat - seedCentre.lat) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, Math.max(1, size))
    const far = ranked[ranked.length - 1].d || 1
    return ranked.map((r) => ({ id: r.id, distance: r.d / far }))
}

/** Bell-shaped storm: 0 at the edges of the duration, 1 at the middle. */
const stormShape = (hour: number, durationHours: number): number => {
    const t = hour - LEAD_HOURS
    if (t < 0 || t >= durationHours) return 0
    return Math.sin((Math.PI * (t + 0.5)) / durationHours) ** 1.5
}

/** Barangay ids a scenario covers, with how strong the storm is over each (1 = full peak). */
export const scenarioTargets = (data: RiskFeatureCollection, p: SimulationParams) => {
    const rng = mulberry32(p.seed + 1)
    // Cluster: strongest at the epicentre, easing to ~45% at its rim. Selected: uniform.
    const base =
        p.mode === 'cluster'
            ? pickCluster(data, p.epicenterId, p.clusterSize, p.seed).map((c) => ({
                  id: c.id,
                  strength: 1 - 0.55 * c.distance,
              }))
            : p.selectedIds.map((id) => ({ id, strength: 1 }))
    return base.map((t) => ({
        id: t.id,
        // Variation scales each barangay's own storm up or down by up to ±variation.
        strength: Math.max(0, t.strength * (1 + (rng() * 2 - 1) * p.variation)),
    }))
}

/** Hourly rainfall for every targeted barangay, ready to POST. */
export const buildRequest = (data: RiskFeatureCollection, p: SimulationParams): SimulationRequest => {
    const hours = totalHours(p.durationHours)
    return {
        barangays: scenarioTargets(data, p).map(({ id, strength }) => ({
            id,
            rain_mm: Array.from({ length: hours }, (_, h) =>
                Number((p.peakMmHr * strength * stormShape(h, p.durationHours)).toFixed(2)),
            ),
        })),
    }
}
