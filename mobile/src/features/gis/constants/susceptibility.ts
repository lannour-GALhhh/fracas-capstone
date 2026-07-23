import type { SusceptibilityLevel } from '../types'

/** Least-to-most severe. */
export const SUSCEPTIBILITY_ORDER: SusceptibilityLevel[] = [
    'very_low',
    'low',
    'moderate',
    'high',
    'very_high',
]

export const SUSCEPTIBILITY_LABELS: Record<SusceptibilityLevel, string> = {
    very_low: 'Very low',
    low: 'Low',
    moderate: 'Moderate',
    high: 'High',
    very_high: 'Very high',
}

/** Green → red susceptibility ramp (ColorBrewer RdYlGn reversed), matching web. */
export const SUSCEPTIBILITY_COLORS: Record<SusceptibilityLevel, string> = {
    very_low: '#1a9850',
    low: '#91cf60',
    moderate: '#fee08b',
    high: '#fc8d59',
    very_high: '#d73027',
}
