import apiClient from '@/app/apiClient'
import type { AutoDetectConfig, RiskConfigSummary, SystemStatus, ZoneAggregation } from '../types/system'

export const getSystemStatus = async (): Promise<SystemStatus> => {
    const { data } = await apiClient.get<SystemStatus>('/api/admin/system/status/')
    return data
}

export const runPipeline = async (): Promise<{ detail: string }> => {
    const { data } = await apiClient.post('/api/admin/system/pipeline/run/')
    return data
}

export const runRetention = async (): Promise<{ detail: string }> => {
    const { data } = await apiClient.post('/api/admin/system/retention/run/')
    return data
}

export const getAutoDetectConfig = async (): Promise<AutoDetectConfig> => {
    const { data } = await apiClient.get<AutoDetectConfig>('/api/flood-events/auto-detect-config/')
    return data
}

export const updateAutoDetectConfig = async (
    payload: Partial<AutoDetectConfig>,
): Promise<AutoDetectConfig> => {
    const { data } = await apiClient.patch<AutoDetectConfig>(
        '/api/flood-events/auto-detect-config/',
        payload,
    )
    return data
}

export const getActiveRiskConfig = async (): Promise<RiskConfigSummary> => {
    const { data } = await apiClient.get<RiskConfigSummary>('/api/admin/risk-configs/active/')
    return data
}

export const updateZoneAggregation = async (
    id: number,
    zone_aggregation: ZoneAggregation,
): Promise<RiskConfigSummary> => {
    const { data } = await apiClient.patch<RiskConfigSummary>(`/api/admin/risk-configs/${id}/`, {
        zone_aggregation,
    })
    return data
}
