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

/** Badge background per tier, green (calm) to red (torrential). */
export const RAINFALL_TIER_COLORS: Record<RainfallTier, string> = {
    none: 'bg-green-500',
    light: 'bg-lime-500',
    moderate: 'bg-yellow-500',
    heavy: 'bg-orange-500',
    intense: 'bg-red-500',
    torrential: 'bg-red-700',
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

/** How a tier looks as animated rain: streak count scales with tier, not with the raw reading. */
export interface RainStyle {
    /** Streaks per 10,000 px² of barangay on screen. */
    density: number
    /** Fall speed, px per second. */
    speed: number
    /** Streak length, px. */
    length: number
    /** Streak opacity, 0–1. */
    alpha: number
    /** Whole-polygon tint opacity, 0–1. */
    wash: number
}

export const RAIN_STYLES: Record<Exclude<RainfallTier, 'none'>, RainStyle> = {
    light: { density: 1.5, speed: 220, length: 8, alpha: 0.35, wash: 0.04 },
    moderate: { density: 4, speed: 320, length: 11, alpha: 0.5, wash: 0.08 },
    heavy: { density: 8, speed: 420, length: 14, alpha: 0.6, wash: 0.12 },
    intense: { density: 14, speed: 540, length: 17, alpha: 0.7, wash: 0.17 },
    torrential: { density: 22, speed: 680, length: 21, alpha: 0.8, wash: 0.22 },
}
