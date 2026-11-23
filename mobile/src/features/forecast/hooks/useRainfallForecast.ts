import { useQuery } from '@tanstack/react-query'

import { getRainfallForecast } from '../api/forecastApi'
import { forecastKeys } from '../api/queryKeys'

/** Matches the server's per-cell cache, so a refetch inside it costs nothing upstream. */
const STALE_MS = 30 * 60 * 1000

/** Forecast for the chosen barangay. Nothing is fetched until one is picked. */
export const useRainfallForecast = (barangayId: number | null) =>
    useQuery({
        queryKey: forecastKeys.barangay(barangayId ?? -1),
        queryFn: () => getRainfallForecast(barangayId as number),
        enabled: barangayId != null,
        staleTime: STALE_MS,
    })
