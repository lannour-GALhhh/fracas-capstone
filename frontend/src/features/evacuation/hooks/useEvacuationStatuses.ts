import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getEvacuationStatuses } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

const REFRESH_MS = 30_000

/** Paginated evacuee drill-down. Keeps the current page visible while paging. */
export const useEvacuationStatuses = (evacuationId: number, page: number) =>
    useQuery({
        queryKey: evacuationKeys.statuses(evacuationId, page),
        queryFn: () => getEvacuationStatuses(evacuationId, page),
        placeholderData: keepPreviousData,
        refetchInterval: REFRESH_MS,
    })
