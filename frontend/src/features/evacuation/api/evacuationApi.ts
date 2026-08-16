import apiClient from '@/app/apiClient'
import type {
    EvacuationAggregate,
    EvacuationHistoryEntry,
    EvacuationHistoryFilters,
    EvacueeStatus,
    Paginated,
    PingResult,
    StandDownResult,
} from '../types/api'

/** Live aggregate for every active evacuation (one shared cached read). */
export const getActiveEvacuations = async (): Promise<EvacuationAggregate[]> => {
    const { data } = await apiClient.get<EvacuationAggregate[]>(
        '/api/evacuation/evacuations/active/',
    )
    return data
}

/** Paginated per-resident drill-down for one evacuation. */
export const getEvacuationStatuses = async (
    evacuationId: number,
    page = 1,
): Promise<Paginated<EvacueeStatus>> => {
    const { data } = await apiClient.get<Paginated<EvacueeStatus>>(
        `/api/evacuation/evacuations/${evacuationId}/statuses/`,
        { params: { page } },
    )
    return data
}

/** Paginated archive of stood-down evacuations. */
export const getEvacuationHistory = async (
    filters: EvacuationHistoryFilters = {},
): Promise<Paginated<EvacuationHistoryEntry>> => {
    const { data } = await apiClient.get<Paginated<EvacuationHistoryEntry>>(
        '/api/evacuation/evacuations/history/',
        { params: filters },
    )
    return data
}

/** Operator ping: open (or reuse) an evacuation for a barangay. */
export const pingEvacuation = async (barangayId: number): Promise<PingResult> => {
    const { data } = await apiClient.post<PingResult>('/api/evacuation/evacuations/', {
        barangay_id: barangayId,
    })
    return data
}

/** Operator stand-down: close an active evacuation and freeze its final counts. */
export const standDownEvacuation = async (
    evacuationId: number,
): Promise<StandDownResult> => {
    const { data } = await apiClient.post<StandDownResult>(
        `/api/evacuation/evacuations/${evacuationId}/stand-down/`,
    )
    return data
}
