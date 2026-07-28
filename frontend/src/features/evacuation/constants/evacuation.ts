import type { EvacuationStatusValue, EvacuationTrigger } from '../types/api'

export const STATUS_LABELS: Record<EvacuationStatusValue, string> = {
    notified: 'Notified',
    moving: 'Moving',
    safe: 'Safe',
    unaccounted: 'Unaccounted',
}

/** Tailwind text/badge tones per reported status. */
export const STATUS_TONES: Record<EvacuationStatusValue, string> = {
    notified: 'bg-amber-100 text-amber-800',
    moving: 'bg-blue-100 text-blue-800',
    safe: 'bg-emerald-100 text-emerald-800',
    unaccounted: 'bg-slate-100 text-slate-600',
}

export const TRIGGER_LABELS: Record<EvacuationTrigger, string> = {
    automated: 'Auto-triggered',
    operator: 'Operator ping',
}

/** Progress-bar segment colors (safe / moving / unaccounted). */
export const SEGMENT_COLORS = {
    safe: '#059669', // emerald-600
    moving: '#2563eb', // blue-600
    unaccounted: '#cbd5e1', // slate-300
} as const
