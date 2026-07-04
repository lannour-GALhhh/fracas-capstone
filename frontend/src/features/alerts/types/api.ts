import type { RiskCategory } from '@/features/gis/types/api'

/** Kinds of alert transition recorded by the backend `AlertEvent` log. */
export type AlertEventKind = 'entered' | 'renotify' | 'all_clear' | 'broadcast'

/** Who originated the event. */
export type AlertEventSource = 'automated' | 'operator'

/** One row of GET /api/alerts/events/ (mirrors AlertEventSerializer). */
export interface AlertEvent {
    id: number
    barangay: number | null
    barangay_name: string | null
    level: RiskCategory
    kind: AlertEventKind
    source: AlertEventSource
    score: number | null
    recipients: number
    suppressed: boolean
    triggered_by_username: string | null
    created_at: string
}

/** DRF page envelope. */
export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

/** Server-side filters for the audit log. `page` drives DRF pagination. */
export interface AlertEventFilters {
    barangay?: number
    source?: AlertEventSource
    kind?: AlertEventKind
    /** `'me'` scopes the log to the requesting operator's own broadcasts. */
    triggered_by?: 'me'
    page?: number
}

/** POST /api/admin/broadcasts/ payload. */
export interface BroadcastPayload {
    barangay: number
    title?: string
    message: string
}

/** POST /api/admin/broadcasts/ response. */
export interface BroadcastResult {
    recipients: number
    dispatch_key: string
}
