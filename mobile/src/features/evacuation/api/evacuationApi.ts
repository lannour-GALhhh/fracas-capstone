import apiClient from '@/core/apiClient'

import type { EvacuationReport, MyEvacuation } from '../types'

/** Active evacuations for the caller's subscribed barangays, with own status. */
export const getMyEvacuations = async (): Promise<MyEvacuation[]> => {
    const { data } = await apiClient.get<MyEvacuation[]>(
        '/api/evacuation/evacuations/for-me/',
    )
    return data
}

/** Report this device's status transition (upserts the one row for this user). */
export const reportEvacuationStatus = async (report: EvacuationReport): Promise<void> => {
    await apiClient.post('/api/evacuation/report/', report)
}
