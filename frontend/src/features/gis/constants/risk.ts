import type { ExpressionSpecification } from 'maplibre-gl'
import type { RiskCategory } from '../types/api'

/** Severity, most-critical first — drives summary ordering. */
export const CATEGORY_ORDER: RiskCategory[] = ['critical', 'high', 'medium', 'low']

export const CATEGORY_LABELS: Record<RiskCategory, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
}

/** Official, concise guidance shown alongside the category in the barangay panel. */
export const CATEGORY_DESCRIPTIONS: Record<RiskCategory, string> = {
    low: 'Risk of flooding is low. No action required at this time.',
    medium: 'Risk of flooding is moderate. Stay alert and monitor conditions.',
    high: 'Risk of flooding is high. Prepare for possible evacuation and remain vigilant.',
    critical: 'Risk of flooding is critical. Evacuate immediately if directed by local authorities.',
}

/** Text-contrast counterpart to `RISK_COLORS`, which is tuned for fills. */
export const RISK_TEXT_COLORS: Record<RiskCategory, string> = {
    low: '#f87171',
    medium: '#ef4444',
    high: '#dc2626',
    critical: '#991b1b',
}

/** White → red intensity ramp; single source of truth for fill/legend/badges. */
export const RISK_COLORS: Record<RiskCategory, string> = {
    low: '#fdeaea',
    medium: '#f2a1a1',
    high: '#dd4b4b',
    critical: '#b01212',
}

/** Barangays with no computed score yet (empty pipeline). */
export const NO_DATA_COLOR = '#e5e7eb'

/** MapLibre fill-color expression keyed on the joined `category` property. */
export const fillColorExpression: ExpressionSpecification = [
    'match',
    ['get', 'category'],
    'low', RISK_COLORS.low,
    'medium', RISK_COLORS.medium,
    'high', RISK_COLORS.high,
    'critical', RISK_COLORS.critical,
    NO_DATA_COLOR,
]

/** Tailwind class helper so DOM chips match the map exactly. */
export const categoryColor = (category: RiskCategory): string => RISK_COLORS[category]
