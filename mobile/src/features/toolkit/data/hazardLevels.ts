import { RISK_COLORS } from '@/common/theme'

import type { HazardLevel } from '../types'

/** Dark text over the pale end of the ramp, white over the deep-red end. */
const DARK = '#0f1115'
const LIGHT = '#ffffff'

/**
 * The hazard ladder explained in plain language, using the same low→critical
 * ramp as the map fill and category badges (single source: RISK_COLORS). This is
 * the offline legend for what a color on the Status map actually means.
 */
export const HAZARD_LEVELS: HazardLevel[] = [
    {
        category: 'low',
        label: 'Low',
        color: RISK_COLORS.low,
        onColor: DARK,
        meaning: 'Minimal flooding expected.',
        action: 'Stay informed. No action needed yet.',
    },
    {
        category: 'medium',
        label: 'Medium',
        color: RISK_COLORS.medium,
        onColor: DARK,
        meaning: 'Localized, shallow flooding is possible.',
        action: 'Prepare your go-bag and keep monitoring updates.',
    },
    {
        category: 'high',
        label: 'High',
        color: RISK_COLORS.high,
        onColor: LIGHT,
        meaning: 'Widespread flooding is likely.',
        action: 'Move valuables up and be ready to evacuate.',
    },
    {
        category: 'critical',
        label: 'Critical',
        color: RISK_COLORS.critical,
        onColor: LIGHT,
        meaning: 'Severe, life-threatening flooding.',
        action: 'Evacuate now to higher ground or the nearest center.',
    },
]
