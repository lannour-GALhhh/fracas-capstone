import { useColorScheme } from 'react-native'

import { colorSchemes, type ThemeColors } from './colors'
import { radius } from './radius'
import { spacing } from './spacing'
import { typography } from './typography'

export { RISK_COLORS, NO_DATA_COLOR, type ThemeColors } from './colors'
export { spacing } from './spacing'
export { radius } from './radius'
export { typography, type TextVariant } from './typography'

export interface Theme {
    colors: ThemeColors
    spacing: typeof spacing
    radius: typeof radius
    typography: typeof typography
    scheme: 'light' | 'dark'
}

/** The active theme, resolved from the device color scheme. */
export function useTheme(): Theme {
    const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
    return { colors: colorSchemes[scheme], spacing, radius, typography, scheme }
}
