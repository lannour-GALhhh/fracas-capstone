import apiClient from '@/app/apiClient'
import type {
    BarangayFeatureCollection,
    BarangayRisk,
    HazardZoneCollection,
    HighRiskStreet,
    RainfallHistoryPoint,
    RiskSnapshot,
    ZoneRiskSnapshot,
} from '../types/api'
import { cachedFetch } from '@/common/utils/persistentCache'

/** Geometry changes only on an admin GIS import, so keep it a day; bump the key version on shape changes. */
const GEOMETRY_MAX_AGE_MS = 24 * 60 * 60 * 1000
/** Big payloads can be slow on a cold server cache; the default 10s timeout would abort them. */
const GEOMETRY_TIMEOUT_MS = 60_000
export const BARANGAYS_CACHE_KEY = 'barangays:v1'
export const HAZARD_ZONES_CACHE_KEY = 'hazard-zones:v1'

/** Barangay geometries (server-cached, and persisted in IndexedDB for a day). Static; join risk on top. */
export const getBarangays = (): Promise<BarangayFeatureCollection> =>
    cachedFetch(BARANGAYS_CACHE_KEY, GEOMETRY_MAX_AGE_MS, async () => {
        const { data } = await apiClient.get<BarangayFeatureCollection>('/api/barangays/', {
            timeout: GEOMETRY_TIMEOUT_MS,
        })
        return data
    })

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

/** Flood-susceptibility zone geometry for the hazard-zone map layer (server-cached; persisted in IndexedDB for a day). */
export const getHazardZones = (): Promise<HazardZoneCollection> =>
    cachedFetch(HAZARD_ZONES_CACHE_KEY, GEOMETRY_MAX_AGE_MS, async () => {
        const { data } = await apiClient.get<HazardZoneCollection>('/api/hazard-zones/', {
            timeout: GEOMETRY_TIMEOUT_MS,
        })
        return data
    })

/** Full-precision zone geometry for one viewport (`west,south,east,north`); the server requires a bbox. */
export const getHazardZonesDetailed = async (bbox: string): Promise<HazardZoneCollection> => {
    const { data } = await apiClient.get<HazardZoneCollection>('/api/hazard-zones/', {
        params: { detail: 'full', bbox },
        timeout: GEOMETRY_TIMEOUT_MS,
    })
    return data
}

/** Latest per-zone computed risk (rainfall-gated) for coloring the hazard-zone layer. */
export const getZoneRiskSnapshot = async (): Promise<ZoneRiskSnapshot> => {
    const { data } = await apiClient.get<ZoneRiskSnapshot>('/api/risk/zones/snapshot/')
    return data
}

/** Named streets in a barangay whose dominant susceptibility is high/very_high. */
export const getBarangayHighRiskStreets = async (id: number): Promise<HighRiskStreet[]> => {
    const { data } = await apiClient.get<HighRiskStreet[]>('/api/high-risk-streets/', {
        params: { barangay: id },
    })
    return data
}

/** Rainfall record for a barangay, oldest first. */
export const getRainfallHistory = async (
    id: number,
    days = 7,
    granularity: 'hour' | 'day' = 'hour',
): Promise<RainfallHistoryPoint[]> => {
    const { data } = await apiClient.get<RainfallHistoryPoint[]>('/api/rainfall/history/', {
        params: { barangay: id, days, granularity },
    })
    return data
}
