import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getFloodEvents } from '../api/floodEventsApi'
import type { FloodEventFilters } from '../types/api'
import { floodEventKeys } from './queryKeys'

/** Paginated flood-history list. Keeps the previous page visible while loading. */
export const useFloodEvents = (filters: FloodEventFilters) =>
    useQuery({
        queryKey: floodEventKeys.list(filters),
        queryFn: () => getFloodEvents(filters),
        placeholderData: keepPreviousData,
    })
