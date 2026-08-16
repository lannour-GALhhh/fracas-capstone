/** Home-address blob captured at registration (PSGC keys mirror the backend). */
export interface RegistrationAddress {
    unit?: string
    province?: string
    province_code?: string
    city?: string
    city_code?: string
    barangay?: string
    barangay_code?: string
    zip_code?: string
}

export type RegistrationStep = 'phone' | 'verify' | 'password'

/** The two documents a resident must accept before verifying. */
export type LegalDocumentId = 'terms' | 'privacy'

/** One numbered clause of a legal document. Paragraphs render before bullets. */
export interface LegalSection {
    heading: string
    body?: string[]
    bullets?: string[]
}

export interface LegalDocument {
    id: LegalDocumentId
    title: string
    /** Version + effective date line, shown under the title. */
    effective: string
    /** Plain-language lead paragraph, before the numbered clauses. */
    intro: string
    sections: LegalSection[]
}
