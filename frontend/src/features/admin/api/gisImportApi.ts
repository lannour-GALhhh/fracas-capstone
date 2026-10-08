import apiClient from '@/app/apiClient'
import type { ActiveLayers, GisImport, GisImportKind } from '../types/gisImport'

export const listGisImports = async (): Promise<GisImport[]> => {
    const { data } = await apiClient.get<GisImport[]>('/api/admin/gis-imports/')
    return data
}

export const uploadGisImport = async (
    kind: GisImportKind,
    file: File,
    onProgress?: (percent: number) => void,
): Promise<GisImport> => {
    const form = new FormData()
    form.append('kind', kind)
    form.append('file', file)
    const { data } = await apiClient.post<GisImport>('/api/admin/gis-imports/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
    })
    return data
}

export const getActiveLayers = async (): Promise<ActiveLayers> => {
    const { data } = await apiClient.get<ActiveLayers>('/api/admin/gis-imports/active/')
    return data
}

export const detectHighRiskStreets = async (): Promise<GisImport> => {
    const { data } = await apiClient.post<GisImport>('/api/admin/gis-imports/detect-streets/')
    return data
}
