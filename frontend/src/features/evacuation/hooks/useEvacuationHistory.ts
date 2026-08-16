import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/context/useAuth'
import { getEvacuationHistory } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'
import type { EvacuationHistoryFilters } from '../types/api'

/**
 * Paginated archive of closed evacuations. Closed records never change, so
 * unlike the live aggregate this doesn't poll — it refreshes when marking one
 * safe invalidates the key. Keeps the current page visible while paging/filtering.
 *
 * Operator-only endpoint, so the query stays disabled for everyone else.
 */
export const useEvacuationHistory = (filters: EvacuationHistoryFilters) => {
    const { isOperator } = useAuth()
    return useQuery({
        queryKey: evacuationKeys.historyList(filters),
        queryFn: () => getEvacuationHistory(filters),
        placeholderData: keepPreviousData,
        enabled: isOperator,
    })
}
