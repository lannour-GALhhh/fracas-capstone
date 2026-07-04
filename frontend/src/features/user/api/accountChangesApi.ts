import apiClient from '@/app/apiClient'
import type { AccountChange, Paginated } from '../types'

/** The signed-in user's own account-change history, newest first. */
export const getAccountChanges = async (): Promise<Paginated<AccountChange>> => {
    const { data } = await apiClient.get<Paginated<AccountChange>>('/api/account/changes/')
    return data
}
