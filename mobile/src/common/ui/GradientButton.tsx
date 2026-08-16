import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'

import { Text } from './Text'

interface Props {
    label: string
    onPress: () => void
    loading?: boolean
    disabled?: boolean
    style?: ViewStyle
}

/**
 * Hero call-to-action: taller than the standard `Button` and filled with a soft
 * primary gradient, for the one action a screen exists to complete. Gradients use
 * RN's `experimental_backgroundImage` (new architecture) so no native module is
 * needed; the flat `primary` fill underneath is the fallback if it can't paint.
 */
export function GradientButton({ label, onPress, loading = false, disabled = false, style }: Props) {
    const theme = useTheme()
    const isDisabled = disabled || loading

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            style={({ pressed }) => [
                styles.base,
                {
                    backgroundColor: theme.colors.primary,
                    experimental_backgroundImage: `linear-gradient(160deg, ${theme.colors.primaryFrom}, ${theme.colors.primaryTo})`,
                    shadowColor: theme.colors.primary,
                },
                pressed && styles.pressed,
                isDisabled && styles.disabled,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
                <Text variant="subtitle" color="onPrimary">
                    {label}
                </Text>
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    base: {
        minHeight: 56,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    pressed: { opacity: 0.85 },
    // Drop the gradient + lift so a blocked CTA reads as inert, not just faded.
    disabled: { experimental_backgroundImage: [], opacity: 0.45, shadowOpacity: 0, elevation: 0 },
})
