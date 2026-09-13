import {
    Cloud,
    CloudDrizzle,
    CloudLightning,
    CloudRain,
    CloudRainWind,
    Tornado,
    type LucideIcon,
} from 'lucide-react'

/**
 * PAGASA rainfall-intensity bands (mm/hr). Mirrors the breakpoints seeded
 * into `DEFAULT_RAINFALL_CURVE` on the backend (backend/risk_score/constants.py) —
 * light <2.5, moderate 2.5–7.5, heavy 7.5–15, intense 15–30, torrential >30.
 */
export type RainfallTier = 'none' | 'light' | 'moderate' | 'heavy' | 'intense' | 'torrential'

/** Most-severe last — for consistency with `CATEGORY_ORDER`'s most-severe-first,
 * consumers that need severity-first order should call `.slice().reverse()`. */
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

/** Floor for a rainfall chart's y-axis, mm/hr — keeps sub-drizzle noise (e.g.
 * 0 vs 0.1) from filling the whole chart height when nothing is really
 * happening; real rain above this scales normally. */
export const RAINFALL_CHART_FLOOR_MM_HR = TIER_UPPER_BOUNDS[0][1]

/** Classifies a mm/hr reading into a PAGASA rainfall-intensity tier. */
export const rainfallTier = (mmPerHour: number | null | undefined): RainfallTier => {
    if (mmPerHour == null || mmPerHour <= 0) return 'none'
    for (const [tier, upperBound] of TIER_UPPER_BOUNDS) {
        if (mmPerHour < upperBound) return tier
    }
    return 'torrential'
}
