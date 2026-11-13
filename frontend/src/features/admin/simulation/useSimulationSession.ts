import { useEffect, useMemo, useState } from 'react'
import type { RiskFeatureCollection } from '@/features/gis/types/api'
import { useRainfallSimulation } from '../hooks/useRainfallSimulation'
import type { SimulationParams } from '../types/simulation'
import { peakHour, scenarioTargets, totalHours } from './scenario'

const STEP_MS = 800

const DEFAULTS: SimulationParams = {
    mode: 'cluster',
    selectedIds: [],
    epicenterId: null,
    clusterSize: 12,
    peakMmHr: 40,
    durationHours: 8,
    variation: 0.2,
    seed: 1,
}

/**
 * One simulation run on top of the live map's geometry: scenario params, timeline position,
 * and the map data (live features with this hour's simulated rain/category merged in).
 * Inert (no requests) while `active` is false.
 */
export const useSimulationSession = (live: RiskFeatureCollection | null, active: boolean) => {
    const [params, setParams] = useState<SimulationParams>(DEFAULTS)
    const [scrub, setScrub] = useState<number | null>(null) // null = sit on the storm peak
    const [playing, setPlaying] = useState(false)

    const sim = useRainfallSimulation(active ? live : null, params)
    const hours = totalHours(params.durationHours)
    const hour = Math.min(scrub ?? peakHour(params.durationHours), hours - 1)

    const update = (patch: Partial<SimulationParams>) => {
        setParams((p) => ({ ...p, ...patch }))
        setScrub(null)
        setPlaying(false)
    }

    const targetIds = useMemo(() => (live ? scenarioTargets(live, params).map((t) => t.id) : []), [live, params])

    useEffect(() => {
        if (!active || !playing) return
        const id = setInterval(() => setScrub((h) => ((h ?? peakHour(params.durationHours)) + 1) % hours), STEP_MS)
        return () => clearInterval(id)
    }, [active, playing, hours, params.durationHours])

    // Simulated barangays carry this hour's result; everything else stays grey and dry.
    const mapData = useMemo<RiskFeatureCollection | null>(() => {
        if (!live || !active) return null
        const byId = new Map(sim.data?.barangays.map((b) => [b.id, b]))
        const targets = new Set(targetIds)
        return {
            ...live,
            features: live.features.map((f) => {
                const step = byId.get(f.properties.id)?.steps[hour]
                return {
                    ...f,
                    properties: {
                        ...f.properties,
                        category: step?.category ?? (targets.has(f.properties.id) ? 'low' : null),
                        score: step?.score ?? null,
                        is_degraded: false,
                        current_rainfall: step?.rain_mm_hr ?? null,
                    },
                }
            }),
        }
    }, [live, active, sim.data, targetIds, hour])

    /** A map click: add/remove a barangay, or move the cluster's centre. */
    const pick = (id: number | null) => {
        if (id == null) return
        if (params.mode === 'cluster') update({ epicenterId: id })
        else
            update({
                selectedIds: params.selectedIds.includes(id)
                    ? params.selectedIds.filter((i) => i !== id)
                    : [...params.selectedIds, id],
            })
    }

    return {
        params,
        update,
        pick,
        hour,
        hours,
        scrubTo: (h: number) => {
            setPlaying(false)
            setScrub(h)
        },
        playing,
        togglePlay: () => setPlaying((p) => !p),
        targetIds,
        results: sim.data?.barangays ?? [],
        isError: sim.isError,
        mapData,
    }
}

export type SimulationSession = ReturnType<typeof useSimulationSession>
