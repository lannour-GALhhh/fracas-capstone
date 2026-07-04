import type { Role } from '@/common/types/Role'

/**
 * Personal home address, sourced from the PSGC API (not our Barangay table).
 * `*_code` are PSGC codes kept so the edit form can re-select the dropdowns.
 */
export interface Address {
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

/** An empty address with the country pre-filled (matches the backend default). */
export const emptyAddress = (): Address => ({
    unit: '',
    province: '',
    province_code: '',
    city: '',
    city_code: '',
    barangay: '',
    barangay_code: '',
    country: 'Philippines',
    zip_code: '',
})

/** The signed-in user's own profile (djoser `/api/auth/users/me/`). */
export interface CurrentUser {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
    phone_number: string | null
    address: Address
    is_active: boolean
    /** Derived console role; read-only (see backend `User.role`). */
    role: Role
}

/** Editable slice of the profile (PATCH `/users/me/`). */
export interface ProfileUpdate {
    first_name: string
    last_name: string
    email: string
    phone_number: string | null
    address: Address
}

/** Payload for djoser `set_password` (no retype server-side). */
export interface PasswordChange {
    current_password: string
    new_password: string
}

/** A flood-event action the signed-in operator took (`FloodEventChange`). */
export type FloodActivityAction =
    | 'created'
    | 'updated'
    | 'confirmed'
    | 'resolved'
    | 'deleted'
    | 'restored'

/** One row of GET /api/flood-events/my-activity/. */
export interface FloodActivity {
    id: number
    flood_event: number
    barangay_name: string | null
    action: FloodActivityAction
    changed_at: string
}

/** DRF page envelope. */
export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

/** A change to the signed-in user's own account (`AccountChange`). */
export type AccountChangeAction = 'updated' | 'password_changed'

/** One row of GET /api/account/changes/. */
export interface AccountChange {
    id: number
    action: AccountChangeAction
    /** For `updated` rows: which profile field changed (blank otherwise). */
    field: string
    old_value: string
    new_value: string
    changed_at: string
    actor_name: string | null
}
