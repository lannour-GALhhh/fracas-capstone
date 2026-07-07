import apiClient from '@/app/apiClient'
import type {
    BarangayFeatureCollection,
    BarangayRisk,
    DamGeoCollection,
    DamStatus,
    RiskSnapshot,
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

/** Current Pasonanca dam reading vs thresholds. */
export const getDamStatus = async (): Promise<DamStatus> => {
    const { data } = await apiClient.get<DamStatus>('/api/dam/status/')
    return data
}

/** Dam point + river corridor geometry for the map (static; ~seldom changes). */
export const getDamGeo = async (): Promise<DamGeoCollection> => {
    const { data } = await apiClient.get<DamGeoCollection>('/api/dam/geo/')
    return data
}
