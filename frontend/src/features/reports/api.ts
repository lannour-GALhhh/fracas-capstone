import apiClient from '@/app/apiClient'
import type { Paginated } from '@/features/history/types/api'
import type { FloodReport, ReportFilters, ReviewInput } from './types'

export const getFloodReports = async (filters: ReportFilters = {}): Promise<Paginated<FloodReport>> => {
    const { data } = await apiClient.get<Paginated<FloodReport>>('/api/flood-reports/', {
        params: filters,
    })
    return data
}

export const reviewFloodReport = async (id: number, payload: ReviewInput): Promise<FloodReport> => {
    const { data } = await apiClient.post<FloodReport>(`/api/flood-reports/${id}/review/`, payload)
    return data
}
