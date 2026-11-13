import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { RiskFeatureCollection } from '@/features/gis/types/api'
import { runRainfallSimulation } from '../api/simulationApi'
import { buildRequest } from '../simulation/scenario'
import type { SimulationParams } from '../types/simulation'
import { adminKeys } from './queryKeys'

const DEBOUNCE_MS = 350

const useDebounced = <T,>(value: T, ms: number): T => {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), ms)
        return () => clearTimeout(id)
    }, [value, ms])
    return debounced
}

/**
 * Scores the scenario on the server whenever its parameters settle. Keeps the previous
 * result on screen while a new one loads, so dragging a slider doesn't blank the map.
 */
export const useRainfallSimulation = (geometry: RiskFeatureCollection | null, params: SimulationParams) => {
    const settled = useDebounced(params, DEBOUNCE_MS)
    const request = useMemo(() => (geometry ? buildRequest(geometry, settled) : null), [geometry, settled])

    return useQuery({
        queryKey: adminKeys.rainfallSimulation(settled),
        queryFn: () => runRainfallSimulation(request!),
        enabled: !!request && request.barangays.length > 0,
        placeholderData: keepPreviousData,
        staleTime: Infinity,
    })
}
