export type ReportStatus = 'pending' | 'verified' | 'rejected'

export interface ReportImage {
    id: number
    image: string
}

/** A flood photo report the resident submitted (GET /api/flood-reports/). */
export interface FloodReport {
    id: number
    barangay: number | null
    barangay_name: string | null
    status: ReportStatus
    description: string
    created_at: string
    review_note: string
    images: ReportImage[]
}

export interface ReportPage {
    count: number
    next: string | null
    results: FloodReport[]
}

/** A photo picked on-device, ready to upload. */
export interface PickedPhoto {
    uri: string
    name: string
    type: string
}

export interface ReportDraft {
    photos: PickedPhoto[]
    description: string
    /** GPS fix, or a manually chosen barangay id — one of the two is required. */
    location: { lat: number; lng: number } | null
    barangayId: number | null
}
