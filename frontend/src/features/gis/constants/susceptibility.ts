import type { ExpressionSpecification } from 'maplibre-gl'
import type { SusceptibilityLevel } from '../types/api'

/** Least-to-most severe — drives legend ordering. */
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

/**
 * Green -> red hazard-map ramp (the ColorBrewer RdYlGn scale, reversed so red
 * reads as most severe). Deliberately its own scale, not `constants/risk.ts`'s
 * white -> red `RISK_COLORS` — susceptibility levels and computed risk
 * categories are different measurements and must not look interchangeable.
 */
export const SUSCEPTIBILITY_COLORS: Record<SusceptibilityLevel, string> = {
    very_low: '#1a9850',
    low: '#91cf60',
    moderate: '#fee08b',
    high: '#fc8d59',
    very_high: '#d73027',
}

/** MapLibre fill-color expression keyed on the hazard zone's `level` property. */
export const fillColorExpression: ExpressionSpecification = [
    'match',
    ['get', 'level'],
    'very_low', SUSCEPTIBILITY_COLORS.very_low,
    'low', SUSCEPTIBILITY_COLORS.low,
    'moderate', SUSCEPTIBILITY_COLORS.moderate,
    'high', SUSCEPTIBILITY_COLORS.high,
    'very_high', SUSCEPTIBILITY_COLORS.very_high,
    SUSCEPTIBILITY_COLORS.very_low,
]
