import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { pingEvacuation } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

export const useMassEvacuation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (barangayIds: number[]) =>
            Promise.allSettled(barangayIds.map(pingEvacuation)),
        onSuccess: (results) => {
            queryClient.invalidateQueries({ queryKey: evacuationKeys.active() })
            const failed = results.filter((r) => r.status === 'rejected').length
            if (failed === 0) {
                toast.success('Evacuations declared', {
                    description: `${results.length} barangays notified.`,
                })
            } else {
                toast.error('Some evacuations failed', {
                    description: `${failed} of ${results.length} could not be declared.`,
                })
            }
        },
        onError: () => {
            toast.error('Couldn’t declare the evacuations', {
                description: 'Nothing was sent. Please try again.',
            })
        },
    })
}
