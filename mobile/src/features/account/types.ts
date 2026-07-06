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

/**
 * PATCH /api/auth/users/me/ payload. `username`, `phone_number` and `role` stay
 * server-controlled: a resident's login username IS their phone, so we don't let
 * them drift apart from the account here.
 */
export interface ProfileUpdate {
    first_name: string
    last_name: string
    email: string
    address: UserAddress
}

/** POST /api/auth/users/set_password/ payload. */
export interface PasswordChange {
    current_password: string
    new_password: string
}
