import { colorSchemes, type ThemeColors } from './colors'
import { radius } from './radius'
import { spacing } from './spacing'
import { typography } from './typography'

export type ColorScheme = 'light' | 'dark'

export interface Theme {
    colors: ThemeColors
    spacing: typeof spacing
    radius: typeof radius
    typography: typeof typography
    scheme: ColorScheme
}

/** Built once per scheme — a stable identity, so `theme` is safe in hook deps. */
const themes: Record<ColorScheme, Theme> = {
    light: { colors: colorSchemes.light, spacing, radius, typography, scheme: 'light' },
    dark: { colors: colorSchemes.dark, spacing, radius, typography, scheme: 'dark' },
}

export function getTheme(scheme: ColorScheme): Theme {
    return themes[scheme]
}
