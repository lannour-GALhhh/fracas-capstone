import { useQuery } from '@tanstack/react-query'
import { getAccountChanges } from '../api/accountChangesApi'

/** Query key for the signed-in user's account-change history. */
export const accountChangesKey = ['accountChanges'] as const

/** The signed-in user's account-change history (profile edits, password changes). */
export const useAccountChanges = () =>
    useQuery({
        queryKey: accountChangesKey,
        queryFn: getAccountChanges,
        staleTime: 60 * 1000,
    })
