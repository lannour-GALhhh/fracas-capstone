import type { FloodEventFilters } from '../types/api'

/** Centralized query keys for the flood-history feature. */
export const floodEventKeys = {
    list: (filters: FloodEventFilters) => ['floodEvents', 'list', filters] as const,
    detail: (id: number) => ['floodEvents', 'detail', id] as const,
}
