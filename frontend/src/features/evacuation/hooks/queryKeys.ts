/** Centralized query keys for the evacuation feature. */
export const evacuationKeys = {
    /** The shared active-evacuations aggregate (map badges + page cards read it). */
    active: () => ['evacuation', 'active'] as const,
    statuses: (evacuationId: number, page: number) =>
        ['evacuation', 'statuses', evacuationId, page] as const,
}
