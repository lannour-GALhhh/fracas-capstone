import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { changePassword, getCurrentUser, updateCurrentUser } from '../api/userApi'
import type { CurrentUser } from '../types'
import { accountChangesKey } from './useAccountChanges'

/** Query key for the signed-in user's profile. */
export const currentUserKey = ['currentUser'] as const

/** The signed-in user's profile. Cached app-wide (Header + AccountPage share it). */
export const useCurrentUser = () =>
    useQuery({
        queryKey: currentUserKey,
        queryFn: getCurrentUser,
        staleTime: 5 * 60 * 1000,
    })

/** Edit profile fields; primes the cache and refreshes the account-change log. */
export const useUpdateProfile = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: updateCurrentUser,
        onSuccess: (user: CurrentUser) => {
            queryClient.setQueryData(currentUserKey, user)
            queryClient.invalidateQueries({ queryKey: accountChangesKey })
            toast.success('Profile updated')
        },
    })
}

/** Change the account password; the change is recorded in the account-change log. */
export const useChangePassword = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: changePassword,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: accountChangesKey })
            toast.success('Password changed')
        },
    })
}
