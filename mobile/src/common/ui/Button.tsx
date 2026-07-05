import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'

import { Text } from './Text'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface Props {
    label: string
    onPress: () => void
    variant?: Variant
    loading?: boolean
    disabled?: boolean
    style?: ViewStyle
}

/** Primary action button with loading + disabled states. */
export function Button({
    label,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
}: Props) {
    const theme = useTheme()
    const isDisabled = disabled || loading

    const bg: Record<Variant, string> = {
        primary: theme.colors.primary,
        secondary: theme.colors.surfaceAlt,
        ghost: 'transparent',
        danger: theme.colors.danger,
    }
    const fg = variant === 'primary' || variant === 'danger' ? 'onPrimary' : 'text'

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.base,
                { backgroundColor: bg[variant] },
                variant === 'ghost' && { borderWidth: 1, borderColor: theme.colors.border },
                (pressed || isDisabled) && styles.dim,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={theme.colors[fg === 'onPrimary' ? 'onPrimary' : 'text']} />
            ) : (
                <Text variant="label" color={fg}>
                    {label}
                </Text>
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    base: {
        minHeight: 48,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dim: { opacity: 0.6 },
})
