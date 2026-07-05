import { useQuery } from '@tanstack/react-query'

import { getEvacuationCenters } from '../api/gisApi'
import { gisKeys } from '../api/queryKeys'

/** Active evacuation centers. Effectively static — cached + persisted offline. */
export const useEvacuationCenters = () =>
    useQuery({
        queryKey: gisKeys.evacuationCenters,
        queryFn: getEvacuationCenters,
        staleTime: Infinity,
        gcTime: Infinity,
    })
