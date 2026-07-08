import apiClient from '@/app/apiClient'
import type { AccountChange, Paginated } from '@/features/user/types'
import type {
    AdminUser,
    AdminUserFilters,
    CreateUserPayload,
    ResetPasswordResult,
    UpdateUserPayload,
} from '../types/user'

export const getAdminUsers = async (
    filters: AdminUserFilters = {},
): Promise<Paginated<AdminUser>> => {
    const { data } = await apiClient.get<Paginated<AdminUser>>('/api/admin/users/', {
        params: filters,
    })
    return data
}

export const getAdminUser = async (id: number): Promise<AdminUser> => {
    const { data } = await apiClient.get<AdminUser>(`/api/admin/users/${id}/`)
    return data
}

export const createAdminUser = async (payload: CreateUserPayload): Promise<AdminUser> => {
    const { data } = await apiClient.post<AdminUser>('/api/admin/users/', payload)
    return data
}

export const updateAdminUser = async (
    id: number,
    payload: UpdateUserPayload,
): Promise<AdminUser> => {
    const { data } = await apiClient.patch<AdminUser>(`/api/admin/users/${id}/`, payload)
    return data
}

export const resetAdminUserPassword = async (id: number): Promise<ResetPasswordResult> => {
    const { data } = await apiClient.post<ResetPasswordResult>(
        `/api/admin/users/${id}/reset-password/`,
    )
    return data
}

export const getAdminUserChanges = async (
    id: number,
    page = 1,
): Promise<Paginated<AccountChange>> => {
    const { data } = await apiClient.get<Paginated<AccountChange>>(
        `/api/admin/users/${id}/changes/`,
        { params: { page } },
    )
    return data
}
