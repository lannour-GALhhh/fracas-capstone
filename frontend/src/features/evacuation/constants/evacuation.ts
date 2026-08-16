import type { EvacuationTrigger } from '../types/api'

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
