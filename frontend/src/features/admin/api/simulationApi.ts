import apiClient from '@/app/apiClient'
import type { SimulationRequest, SimulationResponse } from '../types/simulation'

/** Score hypothetical hourly rainfall through the real risk engine. Stateless on the server. */
export const runRainfallSimulation = async (body: SimulationRequest): Promise<SimulationResponse> => {
    const { data } = await apiClient.post<SimulationResponse>('/api/admin/rainfall-simulation/', body)
    return data
}
