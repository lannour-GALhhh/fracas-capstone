import { Text as RNText, type TextProps } from 'react-native'

import { useTheme, type TextVariant } from '@/common/theme'

type ColorKey = 'text' | 'textMuted' | 'primary' | 'danger' | 'success' | 'onPrimary'

interface Props extends TextProps {
    variant?: TextVariant
    color?: ColorKey
}

/** Themed text. `variant` picks a typography preset; `color` picks a theme color. */
export function Text({ variant = 'body', color = 'text', style, ...rest }: Props) {
    const theme = useTheme()
    return (
        <RNText
            style={[theme.typography[variant], { color: theme.colors[color] }, style]}
            {...rest}
        />
    )
}
