import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    createEvacuationCenter,
    deleteEvacuationCenter,
    getEvacuationCenters,
    getPoiLogs,
    updateEvacuationCenter,
} from './poiApi'
import type { EvacuationInput, PoiKind } from './types'

export const poiKeys = {
    evacuation: ['gis', 'poi', 'evacuation'] as const,
    logsRoot: ['gis', 'poi', 'logs'] as const,
    logs: (poiType?: PoiKind) => ['gis', 'poi', 'logs', poiType ?? 'all'] as const,
}

/** Evacuation centers for the map. */
export const useEvacuationCenters = () =>
    useQuery({
        queryKey: poiKeys.evacuation,
        queryFn: getEvacuationCenters,
        staleTime: 60_000,
    })

interface SaveArgs {
    /** Present → update that center; absent → create a new one. */
    id?: number
    payload: Partial<EvacuationInput>
}

/** Create (no id) or edit (id) an evacuation center, then refresh the map + audit log. */
export const useSaveEvacuationCenter = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: SaveArgs) =>
            id
                ? updateEvacuationCenter(id, payload)
                : createEvacuationCenter(payload as EvacuationInput),
        onSuccess: (_result, { id }) => {
            queryClient.invalidateQueries({ queryKey: poiKeys.evacuation })
            queryClient.invalidateQueries({ queryKey: poiKeys.logsRoot })
            toast.success(id ? 'Evacuation center updated' : 'Evacuation center added')
        },
        onError: (_error, { id }) => {
            toast.error(id ? 'Couldn’t update the center' : 'Couldn’t add the center', {
                description: 'Your changes weren’t saved. Please try again.',
            })
        },
    })
}

/** Delete an evacuation center, then refresh the map + audit log. */
export const useDeleteEvacuationCenter = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => deleteEvacuationCenter(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: poiKeys.evacuation })
            queryClient.invalidateQueries({ queryKey: poiKeys.logsRoot })
            toast.success('Evacuation center deleted')
        },
        onError: () => {
            toast.error('Couldn’t delete the center', {
                description: 'The center is unchanged. Please try again.',
            })
        },
    })
}

/** The POI audit log (operator). */
export const usePoiLogs = (poiType?: PoiKind, enabled = true) =>
    useQuery({
        queryKey: poiKeys.logs(poiType),
        queryFn: () => getPoiLogs(poiType),
        enabled,
    })
