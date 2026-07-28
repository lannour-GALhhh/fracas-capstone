import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { standDownEvacuation } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

/** Operator stand-down. Closes an evacuation and refreshes the aggregate. */
export const useStandDown = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (evacuationId: number) => standDownEvacuation(evacuationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: evacuationKeys.active() })
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
