import type { EvacuationHistoryFilters } from '../types/api'

/** Centralized query keys for the evacuation feature. */
export const evacuationKeys = {
    /** The shared active-evacuations aggregate (map badges + page cards read it). */
    active: () => ['evacuation', 'active'] as const,
    statuses: (evacuationId: number, page: number) =>
        ['evacuation', 'statuses', evacuationId, page] as const,
    /** Root for the archive, so a stand-down can invalidate every filtered page. */
    history: () => ['evacuation', 'history'] as const,
    historyList: (filters: EvacuationHistoryFilters) =>
        [...evacuationKeys.history(), filters] as const,
}
