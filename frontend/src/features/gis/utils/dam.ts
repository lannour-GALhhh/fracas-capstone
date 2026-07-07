/**
 * Shared dam-status helpers: where the level sits between normal and critical,
 * and how that maps to an at-a-glance operational status. Kept in one place so
 * the dashboard card and the side panel classify the dam identically.
 */
import type { DamStatus } from '../types/api'

/** How close the level sits between normal and critical, as a 0–100%. */
export const criticalRatio = (d: DamStatus): number | null => {
    if (d.current_level == null || d.normal_level == null || d.critical_level == null) return null
    const span = d.critical_level - d.normal_level
    if (span <= 0) return null
    return Math.max(0, Math.min(100, ((d.current_level - d.normal_level) / span) * 100))
}

export type DamStatusKey = 'unknown' | 'normal' | 'watch' | 'critical'

/** Presentation for a status: label + a colour used by the badge, bar and trend. */
export interface DamStatusLevel {
    key: DamStatusKey
    label: string
    /** Hex colour for the status accent (badge text, progress fill, trend line). */
    color: string
    /** Tailwind text/bg tint classes for the badge. */
    badgeClass: string
}

// A dam's own status ramp — calm blue → amber → red — deliberately distinct
// from the barangay white→red risk ramp so operators never confuse the two.
const NORMAL_COLOR = '#2563eb'
const WATCH_COLOR = '#b8860b'
const CRITICAL_COLOR = '#b01212'
const UNKNOWN_COLOR = '#6b7280'

/** The level (percent of the normal→critical span) at which we raise a watch. */
export const WATCH_THRESHOLD = 60

const LEVELS: Record<DamStatusKey, DamStatusLevel> = {
    unknown: {
        key: 'unknown',
        label: 'No reading',
        color: UNKNOWN_COLOR,
        badgeClass: 'bg-muted text-muted-foreground',
    },
    normal: {
        key: 'normal',
        label: 'Normal',
        color: NORMAL_COLOR,
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    watch: {
        key: 'watch',
        label: 'Watch',
        color: WATCH_COLOR,
        badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    },
    critical: {
        key: 'critical',
        label: 'Critical',
        color: CRITICAL_COLOR,
        badgeClass: 'bg-destructive/10 text-destructive',
    },
}

/**
 * Classify the dam's live status purely by where the level sits between normal
 * and critical: at/above critical, watch past {@link WATCH_THRESHOLD}, else
 * normal. Spilling is deliberately NOT folded in here — Pasonanca's normal
 * level is ~its spillway crest, so it spills over the crest during ordinary
 * rain long before the level is anywhere near the critical flood threshold.
 * Spilling is surfaced as a separate informational flag by the widgets.
 */
export const damStatus = (d: DamStatus): DamStatusLevel => {
    const ratio = criticalRatio(d)
    if (ratio == null) return LEVELS.unknown
    if (ratio >= 100) return LEVELS.critical
    if (ratio >= WATCH_THRESHOLD) return LEVELS.watch
    return LEVELS.normal
}

export const DAM_NORMAL_LINE_COLOR = WATCH_COLOR
export const DAM_CRITICAL_LINE_COLOR = CRITICAL_COLOR

// Rate-of-change bars read by direction: a rising level (toward flood) is the
// concerning one (amber), a falling level is reassuring (blue).
export const DAM_RISING_COLOR = WATCH_COLOR
export const DAM_FALLING_COLOR = NORMAL_COLOR
