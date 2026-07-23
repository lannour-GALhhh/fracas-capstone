import apiClient from '@/core/apiClient'

import type {
    BarangayFeatureCollection,
    BarangayRisk,
    DamStatus,
    EvacuationCenterCollection,
    LocalizedRisk,
    RiskSnapshot,
} from '../types'

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

/** Pinpoint flood risk at a lat/lng — the resident's exact susceptibility zone. */
export const getLocalizedRisk = async (lat: number, lng: number): Promise<LocalizedRisk> => {
    const { data } = await apiClient.get<LocalizedRisk>('/api/risk/at/', { params: { lat, lng } })
    return data
}

/** Current Pasonanca dam reading vs thresholds. */
export const getDamStatus = async (): Promise<DamStatus> => {
    const { data } = await apiClient.get<DamStatus>('/api/dam/status/')
    return data
}

/** All active evacuation centers as GeoJSON Points (server-cached ~15 min). */
export const getEvacuationCenters = async (): Promise<EvacuationCenterCollection> => {
    const { data } = await apiClient.get<EvacuationCenterCollection>('/api/evacuation/centers/')
    return data
}
