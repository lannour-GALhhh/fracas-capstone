import apiClient from '@/app/apiClient'
import type {
    BarangayFeatureCollection,
    BarangayRisk,
    HazardZoneCollection,
    RiskSnapshot,
    ZoneRiskSnapshot,
} from '../types/api'

/** Barangay geometries (server-cached ~15 min). Static; join risk on top. */
export const getBarangays = async (): Promise<BarangayFeatureCollection> => {
    const { data } = await apiClient.get<BarangayFeatureCollection>('/api/barangays/')
    return data
}

/** Latest risk category/score for every barangay in one read. */
export const getRiskSnapshot = async (): Promise<RiskSnapshot> => {
    const { data } = await apiClient.get<RiskSnapshot>('/api/risk/snapshot/')
    return data
}

/** Full explainable breakdown + rainfall for a single barangay. */
export const getBarangayRisk = async (id: number): Promise<BarangayRisk> => {
    const { data } = await apiClient.get<BarangayRisk>(`/api/risk/barangays/${id}/`)
    return data
}

/** Flood-susceptibility zone geometry for the hazard-zone map layer (server-cached ~15 min). */
export const getHazardZones = async (): Promise<HazardZoneCollection> => {
    const { data } = await apiClient.get<HazardZoneCollection>('/api/hazard-zones/')
    return data
}

/** Latest per-zone computed risk (rainfall-gated) for coloring the hazard-zone layer. */
export const getZoneRiskSnapshot = async (): Promise<ZoneRiskSnapshot> => {
    const { data } = await apiClient.get<ZoneRiskSnapshot>('/api/risk/zones/snapshot/')
    return data
}
