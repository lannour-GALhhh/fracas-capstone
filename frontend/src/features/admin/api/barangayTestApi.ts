import apiClient from '@/app/apiClient'
import type { BarangayTestInput, BarangayTestResponse } from '../types/barangayTest'

/** Score an uploaded hourly-rainfall CSV for one barangay. Stateless on the server. */
export const runBarangayTest = async (input: BarangayTestInput): Promise<BarangayTestResponse> => {
    const body = new FormData()
    body.append('barangay', String(input.barangay))
    body.append('file', input.file)
    if (input.floodAt) body.append('flood_at', input.floodAt)
    body.append('hours_before', String(input.hoursBefore))
    body.append('hours_after', String(input.hoursAfter))
    body.append('min_category', input.minCategory)
    body.append('aggregation', input.aggregation)
    body.append('forecast_lookahead', String(input.forecastLookahead))
    const { data } = await apiClient.post<BarangayTestResponse>('/api/admin/barangay-test/', body)
    return data
}
