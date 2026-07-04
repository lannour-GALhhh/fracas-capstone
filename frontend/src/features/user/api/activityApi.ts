import apiClient from '@/app/apiClient'
import type { FloodActivity, Paginated } from '../types'

/** The signed-in operator's own flood-event actions, newest first. */
export const getMyFloodActivity = async (): Promise<Paginated<FloodActivity>> => {
    const { data } = await apiClient.get<Paginated<FloodActivity>>(
        '/api/flood-events/my-activity/',
    )
    return data
}
