import { useQuery } from '@tanstack/react-query'
import { getFloodEvent } from '../api/floodEventsApi'
import { floodEventKeys } from './queryKeys'

/** Full detail for one flood event. Disabled until an id is known. */
export const useFloodEvent = (id: number | undefined) =>
    useQuery({
        queryKey: floodEventKeys.detail(id ?? 0),
        queryFn: () => getFloodEvent(id as number),
        enabled: id != null,
    })
