import { ActivityIndicator, Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'

import { Icon, type IconName } from './Icon'
import { Text } from './Text'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface Props {
    label: string
    onPress: () => void
    variant?: Variant
    loading?: boolean
    disabled?: boolean
    /** Leading glyph shown beside the label. */
    icon?: IconName
    /** `lg` is a taller call-to-action button. */
    size?: 'md' | 'lg'
    style?: ViewStyle
    labelStyle?: TextStyle
}

/** Primary action button with loading + disabled states. */
export function Button({
    label,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    icon,
    size = 'md',
    style,
    labelStyle,
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
                size === 'lg' && styles.lg,
                { backgroundColor: bg[variant] },
                variant === 'ghost' && { borderWidth: 1, borderColor: theme.colors.border },
                (pressed || isDisabled) && styles.dim,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={theme.colors[fg === 'onPrimary' ? 'onPrimary' : 'text']} />
            ) : (
                <View style={styles.content}>
                    {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 18} color={theme.colors[fg]} /> : null}
                    <Text variant="label" color={fg} style={labelStyle}>
                        {label}
                    </Text>
                </View>
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
    lg: { minHeight: 56 },
    content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    dim: { opacity: 0.6 },
})
