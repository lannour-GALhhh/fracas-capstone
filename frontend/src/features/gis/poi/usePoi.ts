import { useQuery } from '@tanstack/react-query'
import { getEvacuationCenters, getPoiLogs } from './poiApi'
import type { PoiKind } from './types'

export const poiKeys = {
    evacuation: ['gis', 'poi', 'evacuation'] as const,
    logs: (poiType?: PoiKind) => ['gis', 'poi', 'logs', poiType ?? 'all'] as const,
}

/** Evacuation centers for the map — read-only (see ENGINE_V2_PLAN Phase 4). */
export const useEvacuationCenters = () =>
    useQuery({
        queryKey: poiKeys.evacuation,
        queryFn: getEvacuationCenters,
        staleTime: 60_000,
    })

/** The POI audit log (operator). */
export const usePoiLogs = (poiType?: PoiKind, enabled = true) =>
    useQuery({
        queryKey: poiKeys.logs(poiType),
        queryFn: () => getPoiLogs(poiType),
        enabled,
    })
