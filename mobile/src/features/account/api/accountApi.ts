import apiClient from '@/core/apiClient'

import type { CurrentUser } from '../types'

/** The signed-in user's own profile (djoser `/users/me/`). */
export const getCurrentUser = async (): Promise<CurrentUser> => {
    const { data } = await apiClient.get<CurrentUser>('/api/auth/users/me/')
    return data
}
