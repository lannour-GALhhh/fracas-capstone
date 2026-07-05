import { useQuery } from '@tanstack/react-query'

import { getCurrentUser } from '../api/accountApi'

export const accountKeys = {
    me: ['account', 'me'] as const,
}

/** The signed-in resident's profile. Stable across a session; persisted offline. */
export const useCurrentUser = () =>
    useQuery({
        queryKey: accountKeys.me,
        queryFn: getCurrentUser,
        staleTime: 5 * 60_000,
    })
