import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    createEvacuationCenter,
    deleteEvacuationCenter,
    deleteEvacuationImage,
    getEvacuationCenters,
    getPoiLogs,
    reorderEvacuationImages,
    updateEvacuationCenter,
    uploadEvacuationImages,
} from './poiApi'
import type { CenterPhoto, EvacuationInput, PoiKind } from './types'

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
    /** Final ordered photo list (saved + new); first is MAIN. Omit to leave photos alone. */
    photos?: CenterPhoto[]
    /** Existing photo ids to remove. */
    removedImageIds?: number[]
}

/** Create (no id) or edit (id) an evacuation center, then refresh the map + audit log. */
export const useSaveEvacuationCenter = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, payload, photos, removedImageIds = [] }: SaveArgs) => {
            const saved = id
                ? await updateEvacuationCenter(id, payload)
                : await createEvacuationCenter(payload as EvacuationInput)
            const centerId = saved.properties.id
            // Photos go through their own endpoints; the center itself is already saved by now.
            try {
                const files = (photos ?? []).flatMap((p) => (p.file ? [p.file] : []))
                const createdIds = files.length ? await uploadEvacuationImages(centerId, files) : []
                await Promise.all(removedImageIds.map((i) => deleteEvacuationImage(centerId, i)))
                // Uploads come back in file order, so slot them in where the files sit.
                let next = 0
                const order = (photos ?? []).map((p) => p.id ?? createdIds[next++])
                if (order.length > 1) await reorderEvacuationImages(centerId, order)
            } catch {
                toast.warning('Center saved, but some photos failed', {
                    description: 'Open the center again to retry the photos.',
                })
            }
        },
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
