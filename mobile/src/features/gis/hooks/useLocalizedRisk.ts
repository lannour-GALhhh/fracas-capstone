import { useQuery } from '@tanstack/react-query'

import { getLocalizedRisk } from '../api/gisApi'
import { gisKeys } from '../api/queryKeys'
import type { LngLat } from '../utils/geo'

const REFRESH_MS = 5 * 60_000 // match the risk snapshot cadence

/**
 * Pinpoint flood risk at the resident's exact coordinates — resolves the
 * susceptibility zone they're standing in and its localized score. Disabled
 * until a location fix is available. Rounded to ~11 m so tiny GPS jitter
 * doesn't thrash the query key.
 */
export const useLocalizedRisk = (coords: LngLat | null) => {
    const lat = coords ? Math.round(coords.lat * 1e4) / 1e4 : 0
    const lng = coords ? Math.round(coords.lng * 1e4) / 1e4 : 0
    return useQuery({
        queryKey: gisKeys.localizedRisk(lat, lng),
        queryFn: () => getLocalizedRisk(lat, lng),
        enabled: coords != null,
        refetchInterval: REFRESH_MS,
    })
}
