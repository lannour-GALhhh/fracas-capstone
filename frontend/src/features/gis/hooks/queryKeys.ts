/** Centralized query keys — one place to invalidate/prefetch from. */
export const gisKeys = {
    barangays: ['gis', 'barangays'] as const,
    snapshot: ['gis', 'risk', 'snapshot'] as const,
    barangayRisk: (id: number) => ['gis', 'risk', 'barangay', id] as const,
    hazardZones: ['gis', 'hazard-zones'] as const,
}
