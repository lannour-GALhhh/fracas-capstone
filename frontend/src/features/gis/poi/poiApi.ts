import apiClient from '@/app/apiClient'
import type {
    EvacuationCollection,
    EvacuationInput,
    Paginated,
    PoiKind,
    PoiLog,
} from './types'

const EVAC_URL = '/api/evacuation/centers/'

/** Active (or, for operators, all) evacuation centers as GeoJSON. */
export const getEvacuationCenters = async (): Promise<EvacuationCollection> => {
    const { data } = await apiClient.get<EvacuationCollection>(EVAC_URL)
    return data
}

/** Create a new evacuation center (operator only). */
export const createEvacuationCenter = async (payload: EvacuationInput): Promise<void> => {
    await apiClient.post(EVAC_URL, payload)
}

/** Update an existing center — accepts a partial patch (e.g. just lat/lng on drag). */
export const updateEvacuationCenter = async (
    id: number,
    payload: Partial<EvacuationInput>,
): Promise<void> => {
    await apiClient.patch(`${EVAC_URL}${id}/`, payload)
}

/** Delete an evacuation center (operator only). */
export const deleteEvacuationCenter = async (id: number): Promise<void> => {
    await apiClient.delete(`${EVAC_URL}${id}/`)
}

/** POI audit log (operator). Optionally scoped to a POI kind. */
export const getPoiLogs = async (poiType?: PoiKind): Promise<Paginated<PoiLog>> => {
    const { data } = await apiClient.get<Paginated<PoiLog>>('/api/poi/logs/', {
        params: poiType ? { poi_type: poiType } : undefined,
    })
    return data
}
