import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Icon } from '@/common/ui'

interface Props {
    onPress: () => void
    label?: string
    style?: StyleProp<ViewStyle>
}

/** Icon-only back arrow (no outline, no text) for the top-left of secondary pages. */
export function BackArrow({ onPress, label = 'Go back', style }: Props) {
    const theme = useTheme()
    return (
        <Pressable
            onPress={onPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [styles.btn, style, pressed && styles.pressed]}
        >
            <Icon name="arrow-back" size={28} color={theme.colors.text} />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    btn: { padding: spacing.xs },
    pressed: { opacity: 0.6 },
})
