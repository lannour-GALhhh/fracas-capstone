import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'

import { RISK_COLORS, NO_DATA_COLOR } from '@/common/theme'

import type { RiskCategory } from '../types'

/** Severity, most-critical first — drives summary ordering. */
export const CATEGORY_ORDER: RiskCategory[] = ['critical', 'high', 'medium', 'low']

export const CATEGORY_LABELS: Record<RiskCategory, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
}

/** Official, concise guidance shown alongside the category (mirrors the web console). */
export const CATEGORY_DESCRIPTIONS: Record<RiskCategory, string> = {
    low: 'Risk of flooding is low. No action required at this time.',
    medium: 'Risk of flooding is moderate. Stay alert and monitor conditions.',
    high: 'Risk of flooding is high. Prepare for possible evacuation and remain vigilant.',
    critical: 'Risk of flooding is critical. Evacuate immediately if directed by local authorities.',
}

/** The risk ramp is the single source of truth for card badges + the map fill. */
export { RISK_COLORS, NO_DATA_COLOR }

/** Fill color for a barangay by category (null → grey "no data"). */
export const categoryColor = (category: RiskCategory | null): string =>
    category ? RISK_COLORS[category] : NO_DATA_COLOR

/**
 * MapLibre fill-color expression keyed on the joined `category` property — the
 * same match used on the web console, so the choropleth and the card badges
 * read from one ramp. Barangays with no joined category fall back to grey.
 */
export const fillColorExpression: ExpressionSpecification = [
    'match',
    ['get', 'category'],
    'low', RISK_COLORS.low,
    'medium', RISK_COLORS.medium,
    'high', RISK_COLORS.high,
    'critical', RISK_COLORS.critical,
    NO_DATA_COLOR,
]
