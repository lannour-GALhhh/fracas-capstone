import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    createAdminUser,
    resetAdminUserPassword,
    updateAdminUser,
} from '../api/usersApi'
import type { CreateUserPayload, UpdateUserPayload } from '../types/user'

/** Provision a new operator/admin account, then refresh the list it appears in. */
export const useCreateAdminUser = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: CreateUserPayload) => createAdminUser(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
            toast.success('Account created')
        },
        onError: () => {
            toast.error("Couldn't create the account", {
                description: 'Check the fields and try again.',
            })
        },
    })
}

/** Edit a profile field or a role/status flag; invalidates the list + detail + audit trail. */
export const useUpdateAdminUser = (id: number) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: UpdateUserPayload) => updateAdminUser(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
            toast.success('Account updated')
        },
        onError: (error: unknown) => {
            const detail =
                (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            toast.error("Couldn't update the account", {
                description: detail ?? 'Please try again.',
            })
        },
    })
}

/** Rotate an account's password server-side; the generated password is shown once. */
export const useResetAdminUserPassword = (id: number) =>
    useMutation({
        mutationFn: () => resetAdminUserPassword(id),
        onSuccess: () => {
            toast.success('Password reset')
        },
        onError: () => {
            toast.error("Couldn't reset the password", { description: 'Please try again.' })
        },
    })
