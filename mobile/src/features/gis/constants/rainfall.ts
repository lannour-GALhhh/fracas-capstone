import type { IconName } from '@/common/ui'

/** PAGASA rainfall-intensity bands (mm/hr); mirrors backend/risk_score/constants.py. */
export type RainfallTier = 'none' | 'light' | 'moderate' | 'heavy' | 'intense' | 'torrential'

export const RAINFALL_TIER_LABELS: Record<RainfallTier, string> = {
    none: 'No rain',
    light: 'Light drizzle',
    moderate: 'Moderate rain',
    heavy: 'Heavy rain',
    intense: 'Intense rain',
    torrential: 'Torrential rain',
}

/** Glyph escalates with intensity — a calm cloud up to a lightning bolt at torrential. */
export const RAINFALL_TIER_ICONS: Record<RainfallTier, IconName> = {
    none: 'cloud-outline',
    light: 'rainy-outline',
    moderate: 'rainy',
    heavy: 'thunderstorm-outline',
    intense: 'thunderstorm',
    torrential: 'flash',
}

/** Upper bound (exclusive), mm/hr, of every tier below torrential. */
const TIER_UPPER_BOUNDS: [RainfallTier, number][] = [
    ['light', 2.5],
    ['moderate', 7.5],
    ['heavy', 15],
    ['intense', 30],
]

/** Classifies a mm/hr reading into a PAGASA rainfall-intensity tier. */
export const rainfallTier = (mmPerHour: number | null | undefined): RainfallTier => {
    if (mmPerHour == null || mmPerHour <= 0) return 'none'
    for (const [tier, upperBound] of TIER_UPPER_BOUNDS) {
        if (mmPerHour < upperBound) return tier
    }
    return 'torrential'
}
