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
