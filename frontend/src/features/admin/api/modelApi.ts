import apiClient from '@/app/apiClient'
import type { Paginated } from '@/features/user/types'
import type {
    CreateRiskConfigPayload,
    RiskConfig,
    UpdateRiskConfigPayload,
    ValidationRun,
} from '../types/model'

export const getRiskConfigs = async (): Promise<Paginated<RiskConfig>> => {
    const { data } = await apiClient.get<Paginated<RiskConfig>>('/api/admin/risk-configs/')
    return data
}

export const createRiskConfig = async (payload: CreateRiskConfigPayload): Promise<RiskConfig> => {
    const { data } = await apiClient.post<RiskConfig>('/api/admin/risk-configs/', payload)
    return data
}

export const updateRiskConfig = async (
    id: number,
    payload: UpdateRiskConfigPayload,
): Promise<RiskConfig> => {
    const { data } = await apiClient.patch<RiskConfig>(`/api/admin/risk-configs/${id}/`, payload)
    return data
}

export const activateRiskConfig = async (id: number): Promise<RiskConfig> => {
    const { data } = await apiClient.post<RiskConfig>(`/api/admin/risk-configs/${id}/activate/`)
    return data
}

export const getValidationRuns = async (page = 1): Promise<Paginated<ValidationRun>> => {
    const { data } = await apiClient.get<Paginated<ValidationRun>>('/api/admin/validation-runs/', {
        params: { page },
    })
    return data
}

export const getValidationRun = async (id: number): Promise<ValidationRun> => {
    const { data } = await apiClient.get<ValidationRun>(`/api/admin/validation-runs/${id}/`)
    return data
}

export const createValidationRun = async (): Promise<ValidationRun> => {
    const { data } = await apiClient.post<ValidationRun>('/api/admin/validation-runs/')
    return data
}
