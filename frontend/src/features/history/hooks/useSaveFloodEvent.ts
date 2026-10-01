import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createFloodEvent, updateFloodEvent } from '../api/floodEventsApi'
import type { FloodEventInput } from '../types/api'

interface SaveArgs {
    id?: number
    payload: FloodEventInput
    /** Create only: one event is created per barangay id. */
    barangayIds?: number[]
}

/** Create (no id) or edit (id) a flood event, then refresh the list + detail. */
export const useSaveFloodEvent = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload, barangayIds }: SaveArgs) =>
            id
                ? updateFloodEvent(id, payload).then((e) => [e])
                : Promise.all(
                      (barangayIds?.length ? barangayIds : [payload.barangay]).map((barangay) =>
                          createFloodEvent({ ...payload, barangay }),
                      ),
                  ),
        onSuccess: (_result, { id, barangayIds }) => {
            queryClient.invalidateQueries({ queryKey: ['floodEvents'] })
            const n = barangayIds?.length ?? 1
            toast.success(
                id ? 'Flood event updated' : n > 1 ? `${n} flood events created` : 'Flood event created',
            )
        },
        onError: (_error, { id }) => {
            toast.error(id ? 'Couldn’t update the flood event' : 'Couldn’t create the flood event', {
                description: 'Your changes weren’t saved. Please try again.',
            })
        },
    })
}
