import apiClient from '@/core/apiClient'

import type { ReportDraft, ReportPage } from '../types'

export const getMyReports = async (page: number): Promise<ReportPage> => {
    const { data } = await apiClient.get<ReportPage>('/api/flood-reports/', { params: { page } })
    return data
}

/** Multipart upload; the server locates the barangay and links an open event. */
export const submitReport = async (draft: ReportDraft): Promise<void> => {
    const form = new FormData()
    form.append('occurred_at', new Date().toISOString())
    form.append('description', draft.description.trim())
    if (draft.location) {
        form.append('latitude', String(draft.location.lat))
        form.append('longitude', String(draft.location.lng))
    } else if (draft.barangayId != null) {
        form.append('barangay', String(draft.barangayId))
    }
    for (const photo of draft.photos) {
        // React Native's FormData accepts a {uri, name, type} descriptor for files.
        form.append('uploaded_images', photo as unknown as Blob)
    }
    await apiClient.post('/api/flood-reports/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
    })
}
