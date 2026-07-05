/**
 * Color tokens. Semantic light/dark palettes + the shared risk ramp.
 * Components never hardcode hex — they read these via `useTheme()`.
 */

/**
 * White → red intensity ramp, ported verbatim from the web console
 * (`features/gis/constants/risk.ts`). Single source of truth for the map fill,
 * category badges, and the toolkit hazard legend. Danger reads as darker red.
 */
export const RISK_COLORS = {
    low: '#fdeaea',
    medium: '#f2a1a1',
    high: '#dd4b4b',
    critical: '#b01212',
} as const

/** Barangays with no computed score yet (empty pipeline). */
export const NO_DATA_COLOR = '#e5e7eb'

const light = {
    bg: '#ffffff',
    surface: '#f5f6f8',
    surfaceAlt: '#eceef1',
    text: '#0f1115',
    textMuted: '#5b616e',
    border: '#dfe2e7',
    primary: '#1f6feb',
    onPrimary: '#ffffff',
    danger: '#b01212',
    onDanger: '#ffffff',
    success: '#1a7f5a',
}

const dark: typeof light = {
    bg: '#0b0d10',
    surface: '#15181d',
    surfaceAlt: '#1d2127',
    text: '#f2f4f7',
    textMuted: '#9aa1ad',
    border: '#2a2f37',
    primary: '#4c8dff',
    onPrimary: '#0b0d10',
    danger: '#f2a1a1',
    onDanger: '#0b0d10',
    success: '#4cc79a',
}

export type ThemeColors = typeof light

export const colorSchemes = { light, dark } as const
