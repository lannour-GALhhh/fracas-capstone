import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/context/useAuth'
import { getActiveEvacuations } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

// Matches the risk-snapshot cadence; the backend aggregate caches for ~15s.
const REFRESH_MS = 30_000

/** Shared active-evacuations read for both the GIS badges and the page cards. */
export const useActiveEvacuations = () => {
    const { isOperator } = useAuth()
    return useQuery({
        queryKey: evacuationKeys.active(),
        queryFn: getActiveEvacuations,
        refetchInterval: REFRESH_MS,
        enabled: isOperator,
    })
}
