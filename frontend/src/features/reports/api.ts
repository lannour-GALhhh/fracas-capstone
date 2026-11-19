import apiClient from '@/app/apiClient'
import type { Paginated } from '@/features/history/types/api'
import type { BlockedSender, BlockInput, FloodReport, ReportFilters, ReporterBlock, ReviewInput } from './types'

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

export const blockReporter = async (id: number, payload: BlockInput): Promise<ReporterBlock> => {
    const { data } = await apiClient.post<ReporterBlock>(`/api/flood-reports/${id}/block/`, payload)
    return data
}

export const unblockReporter = async (id: number): Promise<void> => {
    await apiClient.post(`/api/flood-reports/${id}/unblock/`)
}

export const getBlockedSenders = async (): Promise<BlockedSender[]> => {
    const { data } = await apiClient.get<BlockedSender[]>('/api/flood-reports/blocked/')
    return data
}

export const unblockSender = async (blockId: number): Promise<void> => {
    await apiClient.post(`/api/flood-reports/blocked/${blockId}/unblock/`)
}
