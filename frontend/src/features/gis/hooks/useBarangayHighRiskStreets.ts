import { useQuery } from '@tanstack/react-query'
import { getBarangayHighRiskStreets } from '../api/gisApi'
import { gisKeys } from './queryKeys'

/** Named streets to avoid in the selected barangay. Disabled until one is picked. */
export const useBarangayHighRiskStreets = (id: number | null) =>
    useQuery({
        queryKey: gisKeys.barangayHighRiskStreets(id ?? -1),
        queryFn: () => getBarangayHighRiskStreets(id as number),
        enabled: id != null,
    })
