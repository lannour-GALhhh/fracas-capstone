import apiClient from '@/app/apiClient'
import type {
    DeclareRadiusInput,
    RadiusEvacuation,
    RadiusEvacuationHistoryEntry,
} from '../types/radius'

export const getRadiusEvacuations = async (): Promise<RadiusEvacuation[]> => {
    const { data } = await apiClient.get<RadiusEvacuation[]>('/api/evacuation/radius/')
    return data
}

export const getRadiusHistory = async (): Promise<RadiusEvacuationHistoryEntry[]> => {
    const { data } = await apiClient.get<RadiusEvacuationHistoryEntry[]>(
        '/api/evacuation/radius/history/',
    )
    return data
}

export const declareRadiusEvacuation = async (
    input: DeclareRadiusInput,
): Promise<RadiusEvacuation> => {
    const { data } = await apiClient.post<RadiusEvacuation>('/api/evacuation/radius/', input)
    return data
}

export const standDownRadiusEvacuation = async (id: number): Promise<void> => {
    await apiClient.post(`/api/evacuation/radius/${id}/stand-down/`)
}
