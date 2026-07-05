import { useQuery } from '@tanstack/react-query'

import { getBarangays } from '../api/gisApi'
import { gisKeys } from '../api/queryKeys'

/** Barangay geometries. Effectively static — cached for the session + persisted offline. */
export const useBarangays = () =>
    useQuery({
        queryKey: gisKeys.barangays,
        queryFn: getBarangays,
        staleTime: Infinity,
        gcTime: Infinity,
    })
