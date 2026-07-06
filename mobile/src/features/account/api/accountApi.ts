import apiClient from '@/core/apiClient'

import type { CurrentUser, PasswordChange, ProfileUpdate } from '../types'

/** The signed-in user's own profile (djoser `/users/me/`). */
export const getCurrentUser = async (): Promise<CurrentUser> => {
    const { data } = await apiClient.get<CurrentUser>('/api/auth/users/me/')
    return data
}

/** Update editable profile fields (name, email, permanent address). */
export const updateCurrentUser = async (payload: ProfileUpdate): Promise<CurrentUser> => {
    const { data } = await apiClient.patch<CurrentUser>('/api/auth/users/me/', payload)
    return data
}

/** Change the account password (djoser `set_password`; 204 on success). */
export const changePassword = async (payload: PasswordChange): Promise<void> => {
    await apiClient.post('/api/auth/users/set_password/', payload)
}
