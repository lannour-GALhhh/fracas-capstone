import type { Role } from '@/common/types/Role'

/** The permanent-address blob stored on the user (PSGC keys + codes). */
export interface UserAddress {
    unit: string
    province: string
    province_code: string
    city: string
    city_code: string
    barangay: string
    barangay_code: string
    country: string
    zip_code: string
}

/** GET /api/auth/users/me/ — the signed-in resident's own profile. */
export interface CurrentUser {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
    phone_number: string | null
    address: UserAddress
    is_active: boolean
    role: Role
}
