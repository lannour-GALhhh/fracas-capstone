import { useState } from 'react'
import { Pressable, StyleSheet, Switch, View } from 'react-native'

import { radius, spacing, useTheme, useThemeControls } from '@/common/theme'
import { Icon, Text } from '@/common/ui'
import { unregisterPushDevice } from '@/features/alerts/hooks/usePushRegistration'
import { useAuth } from '@/features/auth/context/useAuth'

/**
 * Light/dark switch. The whole row is the tap target and the single accessibility
 * element — the `Switch` is decorative, so screen readers announce it once.
 */
export function ThemeToggleRow() {
    const theme = useTheme()
    const { scheme, toggleScheme } = useThemeControls()
    const isDark = scheme === 'dark'

    return (
        <Pressable
            onPress={toggleScheme}
            style={({ pressed }) => [
                styles.item,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                pressed && styles.pressed,
            ]}
            accessibilityRole="switch"
            accessibilityLabel="Dark mode"
            accessibilityState={{ checked: isDark }}
        >
            <Icon
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={22}
                color={theme.colors.textMuted}
            />
            <Text variant="label" style={styles.label}>
                Dark mode
            </Text>
            <View pointerEvents="none">
                <Switch
                    value={isDark}
                    trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                    thumbColor={theme.colors.onPrimary}
                />
            </View>
        </Pressable>
    )
}

export function SignOutRow() {
    const theme = useTheme()
    const { logout } = useAuth()
    const [signingOut, setSigningOut] = useState(false)

    const onSignOut = async () => {
        setSigningOut(true)
        try {
            await unregisterPushDevice() // stop pushes to this device before clearing the session
            await logout()
        } finally {
            setSigningOut(false)
        }
    }

    return (
        <Pressable
            onPress={onSignOut}
            disabled={signingOut}
            style={({ pressed }) => [
                styles.item,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                (pressed || signingOut) && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
        >
            <Icon name="log-out-outline" size={22} color={theme.colors.danger} />
            <Text variant="label" color="danger" style={styles.label}>
                {signingOut ? 'Signing out…' : 'Sign out'}
            </Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderRadius: radius.md,
    },
    pressed: { opacity: 0.6 },
    label: { flex: 1 },
})
