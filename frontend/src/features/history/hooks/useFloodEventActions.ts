import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    confirmFloodEvent,
    resolveFloodEvent,
    restoreFloodEvent,
} from '../api/floodEventsApi'
import type { FloodEventDetail } from '../types/api'
import { floodEventKeys } from './queryKeys'

/** Refresh the list, this event's detail and its audit trail after a lifecycle change. */
const useEventInvalidator = () => {
    const queryClient = useQueryClient()
    return (event: FloodEventDetail) => {
        queryClient.setQueryData(floodEventKeys.detail(event.id), event)
        queryClient.invalidateQueries({ queryKey: ['floodEvents', 'list'] })
        queryClient.invalidateQueries({ queryKey: floodEventKeys.changes(event.id) })
    }
}

/** Confirm an auto-drafted event (records the confirming operator). */
export const useConfirmFloodEvent = () => {
    const invalidate = useEventInvalidator()
    return useMutation({
        mutationFn: (id: number) => confirmFloodEvent(id),
        onSuccess: (event) => {
            invalidate(event)
            toast.success('Flood event confirmed')
        },
        onError: () => {
            toast.error('Couldn’t confirm the flood event', {
                description: 'Please try again.',
            })
        },
    })
}

/** Resolve an event by setting its end time. */
export const useResolveFloodEvent = () => {
    const invalidate = useEventInvalidator()
    return useMutation({
        mutationFn: ({ id, endedAt }: { id: number; endedAt: string }) =>
            resolveFloodEvent(id, endedAt),
        onSuccess: (event) => {
            invalidate(event)
            toast.success('Flood event resolved')
        },
        onError: () => {
            toast.error('Couldn’t resolve the flood event', {
                description: 'Please try again.',
            })
        },
    })
}

/** Undo a soft-delete within the recovery window. */
export const useRestoreFloodEvent = () => {
    const invalidate = useEventInvalidator()
    return useMutation({
        mutationFn: (id: number) => restoreFloodEvent(id),
        onSuccess: (event) => {
            invalidate(event)
            toast.success('Flood event restored')
        },
        onError: () => {
            toast.error('Couldn’t restore the flood event', {
                description: 'It may have already been purged. Please refresh.',
            })
        },
    })
}
