import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { markEvacuationSafe } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

/** Operator "mark as safe": closes an evacuation and refreshes both queries. */
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
