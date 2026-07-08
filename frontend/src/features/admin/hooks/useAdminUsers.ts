import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getAdminUser, getAdminUserChanges, getAdminUsers } from '../api/usersApi'
import type { AdminUserFilters } from '../types/user'
import { adminKeys } from './queryKeys'

/** Paginated, filterable account list. Keeps the previous page visible while the next loads. */
export const useAdminUsers = (filters: AdminUserFilters) =>
    useQuery({
        queryKey: adminKeys.users(filters),
        queryFn: () => getAdminUsers(filters),
        placeholderData: keepPreviousData,
    })

export const useAdminUser = (id: number) =>
    useQuery({
        queryKey: adminKeys.user(id),
        queryFn: () => getAdminUser(id),
    })

export const useAdminUserChanges = (id: number, page: number) =>
    useQuery({
        queryKey: adminKeys.userChanges(id, page),
        queryFn: () => getAdminUserChanges(id, page),
        placeholderData: keepPreviousData,
    })
