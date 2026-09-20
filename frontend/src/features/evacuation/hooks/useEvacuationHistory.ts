import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/context/useAuth'
import { getEvacuationHistory } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'
import type { EvacuationHistoryFilters } from '../types/api'

/** Paginated archive of closed evacuations; operator-only. */
export const useEvacuationHistory = (filters: EvacuationHistoryFilters) => {
    const { isOperator } = useAuth()
    return useQuery({
        queryKey: evacuationKeys.historyList(filters),
        queryFn: () => getEvacuationHistory(filters),
        placeholderData: keepPreviousData,
        enabled: isOperator,
    })
}
