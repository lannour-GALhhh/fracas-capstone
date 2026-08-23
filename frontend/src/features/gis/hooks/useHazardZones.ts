import { useQuery } from '@tanstack/react-query'
import { getHazardZones, getHazardZonesDetailed } from '../api/gisApi'
import { gisKeys } from './queryKeys'

/** Hazard-zone geometries. Derived from a static government shapefile, so
 * cache them for the session same as barangay boundaries. */
export const useHazardZones = () =>
    useQuery({
        queryKey: gisKeys.hazardZones,
        queryFn: getHazardZones,
        staleTime: Infinity,
        gcTime: Infinity,
    })

/** Full-precision hazard-zone geometries. Only fetched once `enabled` (the
 * caller gates this on zoom level — see `HazardZoneLayer`), then cached for
 * the session like the simplified variant. */
export const useHazardZonesDetailed = (enabled: boolean) =>
    useQuery({
        queryKey: gisKeys.hazardZonesDetailed,
        queryFn: getHazardZonesDetailed,
        enabled,
        staleTime: Infinity,
        gcTime: Infinity,
    })
