import type { FloodEventReport } from '@/features/history/types/api'

export type ReportStatus = 'pending' | 'verified' | 'rejected'

/** A photo report as served by /api/flood-reports/ (event link may be empty). */
export interface FloodReport extends Omit<FloodEventReport, 'flood_event'> {
    flood_event: number | null
    barangay: number | null
    barangay_name: string | null
    status: ReportStatus
    latitude: number | null
    longitude: number | null
    reviewed_by_name: string | null
    reviewed_at: string | null
    review_note: string
}

export interface ReportFilters {
    status?: ReportStatus
    unlinked?: boolean
    /** Inclusive ISO date (YYYY-MM-DD) bounds on when the report was sent. */
    sent_after?: string
    sent_before?: string
    page?: number
}

export interface ReviewInput {
    status: 'verified' | 'rejected'
    flood_event?: number | null
    review_note?: string
}
