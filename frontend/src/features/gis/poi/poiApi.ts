import type { Feature, Point } from 'geojson'
import apiClient from '@/app/apiClient'
import type {
    EvacuationCollection,
    EvacuationInput,
    EvacuationProperties,
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
export const createEvacuationCenter = async (
    payload: EvacuationInput,
): Promise<Feature<Point, EvacuationProperties>> => {
    const { data } = await apiClient.post(EVAC_URL, payload)
    return data
}

/** Update an existing center — accepts a partial patch (e.g. just lat/lng on drag). */
export const updateEvacuationCenter = async (
    id: number,
    payload: Partial<EvacuationInput>,
): Promise<Feature<Point, EvacuationProperties>> => {
    const { data } = await apiClient.patch(`${EVAC_URL}${id}/`, payload)
    return data
}

/** Upload photos to a center (operator only, multipart). */
export const uploadEvacuationImages = async (id: number, files: File[]): Promise<number[]> => {
    const form = new FormData()
    files.forEach((f) => form.append('images', f))
    // apiClient defaults to JSON, which would make axios serialize the FormData as an object.
    const { data } = await apiClient.post<{ id: number }[]>(`${EVAC_URL}${id}/images/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.map((img) => img.id) // same order as `files`
}

/** Set the photo order; `ids` must list every photo once, first = MAIN. */
export const reorderEvacuationImages = async (id: number, ids: number[]): Promise<void> => {
    await apiClient.post(`${EVAC_URL}${id}/images/reorder/`, { ids })
}

/** Remove one photo from a center (operator only). */
export const deleteEvacuationImage = async (id: number, imageId: number): Promise<void> => {
    await apiClient.delete(`${EVAC_URL}${id}/images/${imageId}/`)
}

/** Archive an evacuation center (operator only); it is purged after 30 days. */
export const archiveEvacuationCenter = async (id: number): Promise<void> => {
    await apiClient.delete(`${EVAC_URL}${id}/`)
}

/** Archived centers awaiting purge (operator only). */
export const getArchivedEvacuationCenters = async (): Promise<EvacuationCollection> => {
    const { data } = await apiClient.get<EvacuationCollection>(EVAC_URL, {
        params: { archived: 'true' },
    })
    return data
}

/** Bring an archived center back (operator only). */
export const restoreEvacuationCenter = async (id: number): Promise<void> => {
    await apiClient.post(`${EVAC_URL}${id}/restore/`)
}

/** POI audit log (operator). Optionally scoped to a POI kind. */
export const getPoiLogs = async (poiType?: PoiKind): Promise<Paginated<PoiLog>> => {
    const { data } = await apiClient.get<Paginated<PoiLog>>('/api/poi/logs/', {
        params: poiType ? { poi_type: poiType } : undefined,
    })
    return data
}
