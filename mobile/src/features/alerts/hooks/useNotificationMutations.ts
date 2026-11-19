import { useMutation, useQueryClient } from '@tanstack/react-query'

import { markNotificationRead } from '../api/alertsApi'
import { alertKeys } from '../api/queryKeys'

/** Invalidate the feed + unread badge after a read state change. */
const useInvalidateFeed = () => {
    const qc = useQueryClient()
    return () => {
        void qc.invalidateQueries({ queryKey: alertKeys.notifications })
        void qc.invalidateQueries({ queryKey: alertKeys.unreadCount })
    }
}

export const useMarkRead = () => {
    const invalidate = useInvalidateFeed()
    return useMutation({
        mutationFn: (id: number) => markNotificationRead(id),
        onSuccess: invalidate,
    })
}
