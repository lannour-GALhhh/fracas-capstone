import { useMutation, useQueryClient } from '@tanstack/react-query'

import { changePassword, updateCurrentUser } from '../api/accountApi'
import type { CurrentUser, PasswordChange, ProfileUpdate } from '../types'
import { accountKeys } from './useCurrentUser'

/** PATCH the profile, then prime the `me` cache with the fresh server copy. */
export const useUpdateProfile = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: ProfileUpdate) => updateCurrentUser(payload),
        onSuccess: (user: CurrentUser) => qc.setQueryData(accountKeys.me, user),
    })
}

/** Change the account password via djoser `set_password`. */
export const useChangePassword = () =>
    useMutation({ mutationFn: (payload: PasswordChange) => changePassword(payload) })
