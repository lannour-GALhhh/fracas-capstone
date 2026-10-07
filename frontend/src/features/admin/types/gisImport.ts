/** Shapes for admin GIS uploads (/api/admin/gis-imports/). */

export type GisImportKind = 'boundary' | 'susceptibility'
export type GisImportStatus = 'pending' | 'running' | 'succeeded' | 'failed'

export interface GisImport {
    id: number
    kind: GisImportKind
    status: GisImportStatus
    filename: string
    message: string
    result: Record<string, number>
    created_by: string | null
    created_at: string
    finished_at: string | null
}

/** The file currently backing a layer; `seed` means loaded by the server setup, not an upload. */
export interface ActiveLayer {
    filename: string
    in_use_since: string | null
    source: 'upload' | 'seed'
    records: number
}

export type ActiveLayers = Record<GisImportKind, ActiveLayer | null>
