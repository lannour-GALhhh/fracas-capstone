import apiClient from '@/app/apiClient'
import type { EvacuationCollection, Paginated, PoiKind, PoiLog } from './types'

const EVAC_URL = '/api/evacuation/centers/'

/** Active (or, for operators, all) evacuation centers as GeoJSON. Read-only —
 * the console no longer creates/edits/deletes centers (see ENGINE_V2_PLAN Phase 4). */
export const getEvacuationCenters = async (): Promise<EvacuationCollection> => {
    const { data } = await apiClient.get<EvacuationCollection>(EVAC_URL)
    return data
}

/** POI audit log (operator). Optionally scoped to a POI kind. */
export const getPoiLogs = async (poiType?: PoiKind): Promise<Paginated<PoiLog>> => {
    const { data } = await apiClient.get<Paginated<PoiLog>>('/api/poi/logs/', {
        params: poiType ? { poi_type: poiType } : undefined,
    })
    return data
}
