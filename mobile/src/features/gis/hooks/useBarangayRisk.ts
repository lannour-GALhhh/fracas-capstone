import { useQuery } from '@tanstack/react-query'

import { getBarangayRisk } from '../api/gisApi'
import { gisKeys } from '../api/queryKeys'

/** Full risk breakdown for the selected barangay. Disabled until one is picked. */
export const useBarangayRisk = (id: number | null) =>
    useQuery({
        queryKey: gisKeys.barangayRisk(id ?? -1),
        queryFn: () => getBarangayRisk(id as number),
        enabled: id != null,
    })
