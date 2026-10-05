import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getHazardZones, getHazardZonesDetailed } from '../api/gisApi'
import { gisKeys } from './queryKeys'

/** Hazard-zone geometries, cached for the session like barangay boundaries. */
export const useHazardZones = () =>
    useQuery({
        queryKey: gisKeys.hazardZones,
        queryFn: getHazardZones,
        staleTime: Infinity,
        gcTime: Infinity,
    })

/** Full-precision geometries for one viewport bbox; only fetched once `bbox` is set. */
export const useHazardZonesDetailed = (bbox: string | null) =>
    useQuery({
        queryKey: gisKeys.hazardZonesDetailed(bbox ?? ''),
        queryFn: () => getHazardZonesDetailed(bbox as string),
        enabled: bbox !== null,
        placeholderData: keepPreviousData, // keep the old viewport's zones on screen while panning
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
    })
