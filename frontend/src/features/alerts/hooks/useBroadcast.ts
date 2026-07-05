import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { postBroadcast } from '../api/alertsApi'

/** Send an operator broadcast, then refresh the audit log it just appended to. */
export const useBroadcast = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: postBroadcast,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['alerts', 'events'] })
            toast.success('Advisory broadcast sent', {
                description: `Delivered to ${result.recipients} ${result.recipients === 1 ? 'subscriber' : 'subscribers'}.`,
            })
        },
        onError: () => {
            toast.error('Couldn’t send the broadcast', {
                description: 'No advisory was sent. Please try again.',
            })
        },
    })
}
