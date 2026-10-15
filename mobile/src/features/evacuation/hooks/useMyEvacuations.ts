import { useQuery } from '@tanstack/react-query'

import { getMyEvacuations } from '../api/evacuationApi'
import { evacuationKeys } from './queryKeys'

// Polled on the risk-snapshot cadence, so the banner appears within a cycle of a
// declaration and clears within a cycle of a stand-down.
const REFRESH_MS = 30_000

/** Active evacuations for the resident's subscribed barangays (+ own status). */
export const useMyEvacuations = (currentBarangayId: number | null = null) =>
    useQuery({
        queryKey: evacuationKeys.mineAt(currentBarangayId),
        queryFn: () => getMyEvacuations(currentBarangayId),
        staleTime: 0,
        refetchInterval: REFRESH_MS,
    })
