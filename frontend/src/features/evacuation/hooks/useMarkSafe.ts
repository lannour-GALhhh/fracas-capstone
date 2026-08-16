import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { markEvacuationSafe } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

/**
 * Operator "mark as safe". Closes an evacuation, refreshes the live aggregate,
 * and invalidates the archive — the row it just closed now belongs to the history.
 */
export const useMarkSafe = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (evacuationId: number) => markEvacuationSafe(evacuationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: evacuationKeys.active() })
            queryClient.invalidateQueries({ queryKey: evacuationKeys.history() })
            toast.success('Barangay marked as safe', {
                description: 'Final counts frozen for the record.',
            })
        },
        onError: () => {
            toast.error('Couldn’t mark the evacuation as safe', {
                description: 'Please try again.',
            })
        },
    })
}
