import apiClient from '@/core/apiClient'

import type { RainfallForecast } from '../types'

/** Rainfall outlook (now to 11 PM tomorrow) for one barangay. Fetched on demand; the server caches per grid cell. */
export const getRainfallForecast = async (barangayId: number): Promise<RainfallForecast> => {
    const { data } = await apiClient.get<RainfallForecast>('/api/rainfall/forecast/', {
        params: { barangay: barangayId },
    })
    return data
}
