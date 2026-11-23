import { useQuery } from '@tanstack/react-query'
import { getRainfallForecast } from '../api/gisApi'
import { gisKeys } from './queryKeys'

/** Matches the server's per-cell cache, so refetching inside it costs nothing upstream. */
const STALE_MS = 30 * 60 * 1000

/** 24 h rainfall outlook. Only fetches once a barangay is chosen — i.e. when its forecast is opened. */
export const useRainfallForecast = (id: number | null) =>
    useQuery({
        queryKey: gisKeys.rainfallForecast(id ?? -1),
        queryFn: () => getRainfallForecast(id as number),
        enabled: id != null,
        staleTime: STALE_MS,
    })
