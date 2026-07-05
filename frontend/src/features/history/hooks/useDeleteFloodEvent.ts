import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteFloodEvent } from '../api/floodEventsApi'

/** Delete a flood event, then refresh the list. */
export const useDeleteFloodEvent = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => deleteFloodEvent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['floodEvents'] })
            toast.success('Flood event deleted', {
                description: 'Recoverable for the next 6 hours.',
            })
        },
        onError: () => {
            toast.error('Couldn’t delete the flood event', {
                description: 'The record is unchanged. Please try again.',
            })
        },
    })
}
