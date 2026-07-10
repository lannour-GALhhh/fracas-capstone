import { Ionicons } from '@expo/vector-icons'

import { useTheme } from '@/common/theme'

/** Valid Ionicons glyph names (typed so bad names fail at compile time). */
export type IconName = keyof typeof Ionicons.glyphMap

interface Props {
    name: IconName
    size?: number
    /** Any hex/rgb string; defaults to the theme text color. */
    color?: string
}

/** Themed vector icon. The single icon primitive the app draws from (Ionicons). */
export function Icon({ name, size = 22, color }: Props) {
    const theme = useTheme()
    return <Ionicons name={name} size={size} color={color ?? theme.colors.text} />
}
