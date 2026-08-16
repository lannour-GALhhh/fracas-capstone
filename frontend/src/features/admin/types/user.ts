import type { Role } from '@/common/types/Role'

/**
 * The roles this console manages. Residents are deliberately absent: their
 * accounts are personal data with no operational reason to be browsable by
 * staff, and the backend filters them out of `/api/admin/users/` entirely.
 */
export type ConsoleRole = Exclude<Role, 'resident'>

/** One row of GET /api/admin/users/ (mirrors AdminUserSerializer). */
export interface AdminUser {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
    phone_number: string | null
    phone_verified: boolean
    is_active: boolean
    is_operator: boolean
    is_staff: boolean
    role: Role
    date_joined: string
    last_login: string | null
}

/** Server-side filters for the admin user list. `page` drives DRF pagination. */
export interface AdminUserFilters {
    search?: string
    role?: ConsoleRole
    is_active?: boolean
    page?: number
}

/** POST /api/admin/users/ payload — provisions a new console account. */
export interface CreateUserPayload {
    username: string
    password: string
    email?: string
    first_name?: string
    last_name?: string
    phone_number?: string
    is_operator?: boolean
    is_staff?: boolean
}

/** PATCH /api/admin/users/:id/ payload — profile edits and/or role/status flags. */
export type UpdateUserPayload = Partial<
    Pick<
        AdminUser,
        'email' | 'first_name' | 'last_name' | 'phone_number' | 'is_active' | 'is_operator' | 'is_staff'
    >
>

/** POST /api/admin/users/:id/reset-password/ response — shown once. */
export interface ResetPasswordResult {
    password: string
}
