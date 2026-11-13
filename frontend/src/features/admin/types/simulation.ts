import type { RiskCategory } from '@/features/gis/types/api'

/** One simulated hour for one barangay (POST /api/admin/rainfall-simulation/). */
export interface SimulationStep {
    rain_mm_hr: number
    accumulated_24hr: number
    score: number
    category: RiskCategory
}

export interface SimulationBarangayResult {
    id: number
    name: string
    steps: SimulationStep[]
}

export interface SimulationResponse {
    hours: number
    barangays: SimulationBarangayResult[]
}

export interface SimulationRequest {
    barangays: { id: number; rain_mm: number[] }[]
}

export type SimulationMode = 'selected' | 'cluster'

/** Everything the admin can tune; the hourly rainfall for each barangay is derived from it. */
export interface SimulationParams {
    mode: SimulationMode
    /** Barangays picked on the map (mode = selected). */
    selectedIds: number[]
    /** Cluster centre chosen on the map; null = picked at random from `seed`. */
    epicenterId: number | null
    clusterSize: number
    /** Storm peak, mm/hr, at the epicentre / for every selected barangay. */
    peakMmHr: number
    durationHours: number
    /** 0–1: how far each barangay's rainfall may stray from the storm average. */
    variation: number
    /** Drives the random cluster and the per-barangay variation. */
    seed: number
}
