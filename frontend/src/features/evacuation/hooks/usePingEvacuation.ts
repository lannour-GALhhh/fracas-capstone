import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { pingEvacuation } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

/** Operator ping: opens an evacuation and refreshes the shared aggregate. */
export const usePingEvacuation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (barangayId: number) => pingEvacuation(barangayId),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: evacuationKeys.active() })
            if (result.created) {
                toast.success('Evacuation declared', {
                    description: 'Residents notified. Tracking who has evacuated.',
                })
            } else {
                toast.info('Already under evacuation', {
                    description: 'This barangay already has an active evacuation.',
                })
            }
        },
        onError: () => {
            toast.error('Couldn’t declare the evacuation', {
                description: 'Nothing was sent. Please try again.',
            })
        },
    })
}
