import apiClient from '@/app/apiClient'
import type {
    EvacuationAggregate,
    EvacuationHistoryEntry,
    EvacuationHistoryFilters,
    MarkSafeResult,
    Paginated,
    PingResult,
} from '../types/api'

/** Live aggregate for every active evacuation (one shared cached read). */
export const getActiveEvacuations = async (): Promise<EvacuationAggregate[]> => {
    const { data } = await apiClient.get<EvacuationAggregate[]>(
        '/api/evacuation/evacuations/active/',
    )
    return data
}

/** Paginated archive of closed evacuations. */
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

/**
 * Mark safe: close an active evacuation and freeze its final counts.
 * The backend route is still `stand-down/` — only the operator-facing wording changed.
 */
export const markEvacuationSafe = async (evacuationId: number): Promise<MarkSafeResult> => {
    const { data } = await apiClient.post<MarkSafeResult>(
        `/api/evacuation/evacuations/${evacuationId}/stand-down/`,
    )
    return data
}
