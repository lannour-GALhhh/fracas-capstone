import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    createEvacuationCenter,
    createHotspot,
    deleteEvacuationCenter,
    deleteHotspot,
    getEvacuationCenters,
    getHotspots,
    getPoiLogs,
    updateEvacuationCenter,
    updateHotspot,
} from './poiApi'
import type { EvacuationWrite, HotspotWrite, PoiKind } from './types'

export const poiKeys = {
    evacuation: ['gis', 'poi', 'evacuation'] as const,
    hotspots: ['gis', 'poi', 'hotspots'] as const,
    logs: (poiType?: PoiKind) => ['gis', 'poi', 'logs', poiType ?? 'all'] as const,
}

/** Evacuation centers for the map (operators see inactive ones too). */
export const useEvacuationCenters = () =>
    useQuery({
        queryKey: poiKeys.evacuation,
        queryFn: getEvacuationCenters,
        staleTime: 60_000,
    })

/** Create / update / delete evacuation centers, invalidating the map + log. */
export const useEvacuationMutations = () => {
    const queryClient = useQueryClient()
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: poiKeys.evacuation })
        queryClient.invalidateQueries({ queryKey: ['gis', 'poi', 'logs'] })
    }

    const create = useMutation({
        mutationFn: (payload: EvacuationWrite) => createEvacuationCenter(payload),
        onSuccess: () => {
            invalidate()
            toast.success('Evacuation center added')
        },
        onError: () => toast.error('Couldn’t add the evacuation center'),
    })

    const update = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<EvacuationWrite> }) =>
            updateEvacuationCenter(id, payload),
        onSuccess: () => {
            invalidate()
            toast.success('Evacuation center updated')
        },
        onError: () => toast.error('Couldn’t update the evacuation center'),
    })

    const remove = useMutation({
        mutationFn: (id: number) => deleteEvacuationCenter(id),
        onSuccess: () => {
            invalidate()
            toast.success('Evacuation center removed')
        },
        onError: () => toast.error('Couldn’t remove the evacuation center'),
    })

    return { create, update, remove }
}

/** Flood hotspots for the map (operators see inactive ones too). */
export const useHotspots = () =>
    useQuery({
        queryKey: poiKeys.hotspots,
        queryFn: getHotspots,
        staleTime: 60_000,
    })

/** Create / update / delete flood hotspots, invalidating the map + log. */
export const useHotspotMutations = () => {
    const queryClient = useQueryClient()
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: poiKeys.hotspots })
        queryClient.invalidateQueries({ queryKey: ['gis', 'poi', 'logs'] })
    }

    const create = useMutation({
        mutationFn: (payload: HotspotWrite) => createHotspot(payload),
        onSuccess: () => {
            invalidate()
            toast.success('Flood hotspot added')
        },
        onError: () => toast.error('Couldn’t add the hotspot'),
    })

    const update = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<HotspotWrite> }) =>
            updateHotspot(id, payload),
        onSuccess: () => {
            invalidate()
            toast.success('Flood hotspot updated')
        },
        onError: () => toast.error('Couldn’t update the hotspot'),
    })

    const remove = useMutation({
        mutationFn: (id: number) => deleteHotspot(id),
        onSuccess: () => {
            invalidate()
            toast.success('Flood hotspot removed')
        },
        onError: () => toast.error('Couldn’t remove the hotspot'),
    })

    return { create, update, remove }
}

/** The POI audit log (operator). */
export const usePoiLogs = (poiType?: PoiKind, enabled = true) =>
    useQuery({
        queryKey: poiKeys.logs(poiType),
        queryFn: () => getPoiLogs(poiType),
        enabled,
    })
