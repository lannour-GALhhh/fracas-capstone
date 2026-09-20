/** Shapes for the admin System Ops page (GET /api/admin/system/status/). */

/** A dependency probe (database / cache) from the readiness check. */
export interface Probe {
    ok: boolean
    detail: string
}

/** Per-source ingestion freshness (currently just rainfall). */
export interface IngestionSource {
    fresh: boolean
    last_success_at: string | null
    status?: string
    consecutive_failures?: number
}

/** One stage of the ingest -> score -> evacuation pipeline. */
export interface PipelineStage {
    last_run: string | null
    fresh: boolean
}

/** A read-only Celery Beat cadence entry (runtime editing is deferred). */
export interface CadenceEntry {
    task: string
    cadence: string
}

export interface SystemStatus {
    healthy: boolean
    database: Probe
    cache: Probe
    ingestion: Record<string, IngestionSource>
    pipeline: {
        rainfall: PipelineStage
        scoring: PipelineStage
        evacuation: PipelineStage
    }
    cadence: CadenceEntry[]
}

/** Auto-detect config (GET/PATCH /api/flood-events/auto-detect-config/). */
export interface AutoDetectConfig {
    enabled: boolean
    threshold_category: 'medium' | 'high' | 'critical'
    updated_at: string
}
