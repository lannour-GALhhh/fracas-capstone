import { useQuery } from '@tanstack/react-query'
import { getMyFloodActivity } from '../api/activityApi'

/** Query key for the signed-in operator's flood-event activity. */
export const myFloodActivityKey = ['myFloodActivity'] as const

/** The signed-in operator's flood-event actions (confirm/resolve/…). */
export const useMyFloodActivity = () =>
    useQuery({
        queryKey: myFloodActivityKey,
        queryFn: getMyFloodActivity,
        staleTime: 60 * 1000,
    })
