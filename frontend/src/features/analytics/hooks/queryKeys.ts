import type { AnalyticsWindow } from '../types/api'

/** Centralized query keys for the analytics feature, scoped by window. */
export const analyticsKeys = {
    all: ['analytics'] as const,
    summary: (days: AnalyticsWindow) => ['analytics', 'summary', days] as const,
    hotspots: (days: AnalyticsWindow) => ['analytics', 'hotspots', days] as const,
    rainfall: (days: AnalyticsWindow) => ['analytics', 'rainfall', days] as const,
    model: () => ['analytics', 'model'] as const,
}
