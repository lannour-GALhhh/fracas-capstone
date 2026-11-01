import { useQuery } from '@tanstack/react-query'

import { getRadiusEvacuations } from './api'

export const radiusKeys = { all: ['evacuation', 'radius'] as const }

// Same cadence as the zone evacuation feed: appears/clears within a cycle.
const REFRESH_MS = 30_000

/** Active point + radius evacuations — shown to every resident, not just subscribers. */
export const useRadiusEvacuations = () =>
    useQuery({
        queryKey: radiusKeys.all,
        queryFn: getRadiusEvacuations,
        staleTime: 0,
        refetchInterval: REFRESH_MS,
    })
