import apiClient from '@/app/apiClient'
import type {
    EvacuationCollection,
    EvacuationWrite,
    HotspotCollection,
    HotspotWrite,
    Paginated,
    PoiKind,
    PoiLog,
} from './types'

const EVAC_URL = '/api/evacuation/centers/'
const HOTSPOT_URL = '/api/hotspots/'

/** Active (or, for operators, all) evacuation centers as GeoJSON. */
export const getEvacuationCenters = async (): Promise<EvacuationCollection> => {
    const { data } = await apiClient.get<EvacuationCollection>(EVAC_URL)
    return data
}

export const createEvacuationCenter = async (payload: EvacuationWrite) => {
    const { data } = await apiClient.post(EVAC_URL, payload)
    return data
}

export const updateEvacuationCenter = async (id: number, payload: Partial<EvacuationWrite>) => {
    const { data } = await apiClient.patch(`${EVAC_URL}${id}/`, payload)
    return data
}

export const deleteEvacuationCenter = async (id: number): Promise<void> => {
    await apiClient.delete(`${EVAC_URL}${id}/`)
}

/** Active (or, for operators, all) flood hotspots as GeoJSON. */
export const getHotspots = async (): Promise<HotspotCollection> => {
    const { data } = await apiClient.get<HotspotCollection>(HOTSPOT_URL)
    return data
}

export const createHotspot = async (payload: HotspotWrite) => {
    const { data } = await apiClient.post(HOTSPOT_URL, payload)
    return data
}

export const updateHotspot = async (id: number, payload: Partial<HotspotWrite>) => {
    const { data } = await apiClient.patch(`${HOTSPOT_URL}${id}/`, payload)
    return data
}

export const deleteHotspot = async (id: number): Promise<void> => {
    await apiClient.delete(`${HOTSPOT_URL}${id}/`)
}

/** POI audit log (operator). Optionally scoped to a POI kind. */
export const getPoiLogs = async (poiType?: PoiKind): Promise<Paginated<PoiLog>> => {
    const { data } = await apiClient.get<Paginated<PoiLog>>('/api/poi/logs/', {
        params: poiType ? { poi_type: poiType } : undefined,
    })
    return data
}
