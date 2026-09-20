import { useQuery } from '@tanstack/react-query'
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

/** Full-precision hazard-zone geometries; only fetched once `enabled`. */
export const useHazardZonesDetailed = (enabled: boolean) =>
    useQuery({
        queryKey: gisKeys.hazardZonesDetailed,
        queryFn: getHazardZonesDetailed,
        enabled,
        staleTime: Infinity,
        gcTime: Infinity,
    })
