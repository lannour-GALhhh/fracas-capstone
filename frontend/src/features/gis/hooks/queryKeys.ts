/** Centralized query keys — one place to invalidate/prefetch from. */
export const gisKeys = {
    barangays: ['gis', 'barangays'] as const,
    snapshot: ['gis', 'risk', 'snapshot'] as const,
    barangayRisk: (id: number) => ['gis', 'risk', 'barangay', id] as const,
    damStatus: ['gis', 'dam', 'status'] as const,
    damGeo: ['gis', 'dam', 'geo'] as const,
}
