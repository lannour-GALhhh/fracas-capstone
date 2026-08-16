import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { standDownEvacuation } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

/**
 * Operator stand-down. Closes an evacuation, refreshes the live aggregate, and
 * invalidates the archive — the row it just closed now belongs to the history.
 */
export const useStandDown = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (evacuationId: number) => standDownEvacuation(evacuationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: evacuationKeys.active() })
            queryClient.invalidateQueries({ queryKey: evacuationKeys.history() })
            toast.success('Evacuation stood down', {
                description: 'Final counts frozen for the record.',
            })
        },
        onError: () => {
            toast.error('Couldn’t stand down the evacuation', {
                description: 'Please try again.',
            })
        },
    })
}
