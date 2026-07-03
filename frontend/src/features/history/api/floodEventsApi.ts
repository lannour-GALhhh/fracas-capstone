import apiClient from '@/app/apiClient'
import type { FloodEvent, FloodEventDetail, FloodEventFilters, Paginated } from '../types/api'

/** Paginated, filterable flood-history list. */
export const getFloodEvents = async (
    filters: FloodEventFilters = {},
): Promise<Paginated<FloodEvent>> => {
    const { data } = await apiClient.get<Paginated<FloodEvent>>('/api/flood-events/', {
        params: filters,
    })
    return data
}

/** Full flood event: stored fields + response timeline + derived telemetry. */
export const getFloodEvent = async (id: number): Promise<FloodEventDetail> => {
    const { data } = await apiClient.get<FloodEventDetail>(`/api/flood-events/${id}/`)
    return data
}
