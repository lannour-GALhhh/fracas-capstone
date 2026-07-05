import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createFloodEvent, updateFloodEvent } from '../api/floodEventsApi'
import type { FloodEventInput } from '../types/api'

interface SaveArgs {
    id?: number
    payload: FloodEventInput
}

/** Create (no id) or edit (id) a flood event, then refresh the list + detail. */
export const useSaveFloodEvent = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: SaveArgs) =>
            id ? updateFloodEvent(id, payload) : createFloodEvent(payload),
        onSuccess: (_result, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['floodEvents'] })
            toast.success(id ? 'Flood event updated' : 'Flood event created')
        },
        onError: (_error, { id }) => {
            toast.error(id ? 'Couldn’t update the flood event' : 'Couldn’t create the flood event', {
                description: 'Your changes weren’t saved. Please try again.',
            })
        },
    })
}
