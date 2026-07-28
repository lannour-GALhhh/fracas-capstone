import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/context/useAuth'
import { getActiveEvacuations } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

// Matches the risk-snapshot cadence — the backend aggregate itself caches for
// ~15s, so this only pulls fresh numbers roughly once per cache window.
const REFRESH_MS = 30_000

/**
 * The one shared read behind both operator surfaces: the GIS ping badges and
 * the /evacuation page cards. A single query key means they never double-fetch.
 *
 * The endpoint is operator-only, and the GIS map is resident-visible, so the
 * query is disabled for non-operators (no fruitless 403 polling).
 */
export const useActiveEvacuations = () => {
    const { isOperator } = useAuth()
    return useQuery({
        queryKey: evacuationKeys.active(),
        queryFn: getActiveEvacuations,
        refetchInterval: REFRESH_MS,
        enabled: isOperator,
    })
}
