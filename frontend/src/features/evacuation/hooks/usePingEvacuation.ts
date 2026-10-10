import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { SusceptibilityLevel } from '@/features/gis/types/api'
import { pingEvacuation } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

/** Operator ping: opens an evacuation and refreshes the shared aggregate. */
export const usePingEvacuation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ barangayId, zones }: { barangayId: number; zones: SusceptibilityLevel[] }) =>
            pingEvacuation(barangayId, zones),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: evacuationKeys.active() })
            if (result.skipped) {
                toast.info('Nothing to evacuate', {
                    description: 'No zone in this barangay is at High or Critical risk.',
                })
            } else if (result.created) {
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
