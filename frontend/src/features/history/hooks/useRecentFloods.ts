import { useQuery } from '@tanstack/react-query'
import { getFloodEvents } from '../api/floodEventsApi'
import type { FloodEventFilters } from '../types/api'
import { floodEventKeys } from './queryKeys'

/** ISO date (YYYY-MM-DD) for `days` ago, local time. */
const daysAgo = (days: number): string => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Recent flood events for one barangay, most recent first. */
export const useRecentFloods = (barangayId: number | undefined, withinDays = 7) => {
    const filters: FloodEventFilters = {
        barangay: barangayId,
        occurred_after: daysAgo(withinDays),
    }
    return useQuery({
        queryKey: floodEventKeys.list(filters),
        queryFn: () => getFloodEvents(filters),
        enabled: barangayId != null,
    })
}
