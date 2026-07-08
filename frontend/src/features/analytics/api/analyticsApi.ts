import apiClient from '@/app/apiClient'
import type {
    AnalyticsSummary,
    AnalyticsWindow,
    Hotspot,
    RainfallTimeline,
    ValidationRunPoint,
} from '../types/api'

/** Every analytics endpoint takes the same `?days=` window param. */
const params = (days: AnalyticsWindow) => ({ params: { days } })

export const getSummary = async (days: AnalyticsWindow): Promise<AnalyticsSummary> => {
    const { data } = await apiClient.get<AnalyticsSummary>('/api/analytics/summary/', params(days))
    return data
}

export const getHotspots = async (days: AnalyticsWindow): Promise<Hotspot[]> => {
    const { data } = await apiClient.get<Hotspot[]>('/api/analytics/hotspots/', params(days))
    return data
}

export const getRainfallTimeline = async (
    days: AnalyticsWindow,
): Promise<RainfallTimeline> => {
    const { data } = await apiClient.get<RainfallTimeline>(
        '/api/analytics/rainfall-timeline/',
        params(days),
    )
    return data
}

/** Recent validation runs (not windowed server-side, but keyed by window for cache parity). */
export const getModelPerformance = async (): Promise<ValidationRunPoint[]> => {
    const { data } = await apiClient.get<ValidationRunPoint[]>('/api/analytics/model-performance/')
    return data
}
