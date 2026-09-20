import { useQuery } from '@tanstack/react-query'
import { getRainfallHistory } from '../api/gisApi'
import { gisKeys } from './queryKeys'

/** Rainfall record for the trailing `days` window. Disabled until a barangay is picked. */
export const useRainfallHistory = (id: number | null, days = 7, granularity: 'hour' | 'day' = 'hour') =>
    useQuery({
        queryKey: gisKeys.rainfallHistory(id ?? -1, days, granularity),
        queryFn: () => getRainfallHistory(id as number, days, granularity),
        enabled: id != null,
    })
