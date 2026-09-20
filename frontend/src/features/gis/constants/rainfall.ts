import {
    Cloud,
    CloudDrizzle,
    CloudLightning,
    CloudRain,
    CloudRainWind,
    Tornado,
    type LucideIcon,
} from 'lucide-react'

/** PAGASA rainfall-intensity bands (mm/hr); mirrors backend/risk_score/constants.py. */
export type RainfallTier = 'none' | 'light' | 'moderate' | 'heavy' | 'intense' | 'torrential'

/** Most-severe last; reverse for severity-first order. */
export const RAINFALL_TIER_ORDER: RainfallTier[] = [
    'none',
    'light',
    'moderate',
    'heavy',
    'intense',
    'torrential',
]

export const RAINFALL_TIER_LABELS: Record<RainfallTier, string> = {
    none: 'No rain',
    light: 'Light drizzle',
    moderate: 'Moderate rain',
    heavy: 'Heavy rain',
    intense: 'Intense rain',
    torrential: 'Torrential rain',
}

/** Glyph escalates with intensity — a calm cloud up to a tornado at torrential. */
export const RAINFALL_TIER_ICONS: Record<RainfallTier, LucideIcon> = {
    none: Cloud,
    light: CloudDrizzle,
    moderate: CloudRain,
    heavy: CloudRainWind,
    intense: CloudLightning,
    torrential: Tornado,
}

/** Upper bound (exclusive), mm/hr, of every tier below torrential. */
const TIER_UPPER_BOUNDS: [RainfallTier, number][] = [
    ['light', 2.5],
    ['moderate', 7.5],
    ['heavy', 15],
    ['intense', 30],
]

/** Floor for a rainfall chart's y-axis, mm/hr; keeps sub-drizzle noise flat. */
export const RAINFALL_CHART_FLOOR_MM_HR = TIER_UPPER_BOUNDS[0][1]

/** Classifies a mm/hr reading into a PAGASA rainfall-intensity tier. */
export const rainfallTier = (mmPerHour: number | null | undefined): RainfallTier => {
    if (mmPerHour == null || mmPerHour <= 0) return 'none'
    for (const [tier, upperBound] of TIER_UPPER_BOUNDS) {
        if (mmPerHour < upperBound) return tier
    }
    return 'torrential'
}

/** A single tier-ceiling reference line for a rainfall chart. */
export interface RainfallStrengthIndicator {
    tier: RainfallTier
    /** mm/hr value to draw the line at. */
    at: number
}

/** The tier-boundary line to draw given the highest reading in view. */
export const rainfallStrengthIndicator = (maxMmPerHour: number): RainfallStrengthIndicator => {
    const tier = rainfallTier(maxMmPerHour)
    const ceiling = TIER_UPPER_BOUNDS.find(([t]) => t === tier)
    if (ceiling) return { tier, at: ceiling[1] }
    if (tier === 'torrential') return { tier, at: TIER_UPPER_BOUNDS[TIER_UPPER_BOUNDS.length - 1][1] }
    return { tier: 'light', at: TIER_UPPER_BOUNDS[0][1] }
}
