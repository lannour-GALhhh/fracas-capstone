import type { AnalyticsWindow, FloodSeverity } from '../types/api'

/** Window options for the selector, in the order operators scan them. */
export const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
]

export const DEFAULT_WINDOW: AnalyticsWindow = 30

/** All panels refetch on this cadence (matches the alerts page). */
export const REFRESH_MS = 60_000

/**
 * Rainfall is its own measure (not a risk category), so it gets a single
 * distinct blue hue — kept away from the reserved white→red risk ramp
 * (`RISK_COLORS`) that every category chip/map fill uses.
 */
export const RAINFALL_COLOR = '#2563eb'

/** Flood-event marker colour by severity (amber → red status ramp). */
export const SEVERITY_COLORS: Record<FloodSeverity, string> = {
    minor: '#e0a100',
    moderate: '#dd4b4b',
    major: '#b01212',
}

export const SEVERITY_LABELS: Record<FloodSeverity, string> = {
    minor: 'Minor',
    moderate: 'Moderate',
    major: 'Major',
}
