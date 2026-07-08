import { useQuery } from '@tanstack/react-query'
import { getHazardZones } from '../api/gisApi'
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
