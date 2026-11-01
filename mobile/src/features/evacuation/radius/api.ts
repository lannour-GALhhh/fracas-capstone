import apiClient from '@/core/apiClient'

import type { RadiusEvacuation, RadiusReport } from './types'

export const getRadiusEvacuations = async (): Promise<RadiusEvacuation[]> => {
    const { data } = await apiClient.get<RadiusEvacuation[]>('/api/evacuation/radius/')
    return data
}

export const reportRadiusStatus = async (report: RadiusReport): Promise<void> => {
    await apiClient.post('/api/evacuation/radius/report/', report)
}
