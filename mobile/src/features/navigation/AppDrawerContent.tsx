import { type DrawerContentComponentProps, DrawerContentScrollView } from 'expo-router/drawer'
import { useState } from 'react'
import { Pressable, StyleSheet, Switch, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { radius, spacing, useTheme, useThemeControls } from '@/common/theme'
import { Icon, Spinner, Text } from '@/common/ui'
import { unregisterPushDevice } from '@/features/alerts/hooks/usePushRegistration'
import { useAuth } from '@/features/auth/context/useAuth'
import { useCurrentUser } from '@/features/account/hooks/useCurrentUser'

/**
 * The side panel. A user-info header plus dark mode and sign-out — the primary
 * destinations (GIS, Notifications, Toolkit, Me) live in the bottom tab bar now,
 * so this drawer only carries what doesn't fit there. Opened by the header
 * hamburger or an edge swipe.
 */
export function AppDrawerContent(props: DrawerContentComponentProps) {
    const theme = useTheme()
    const insets = useSafeAreaInsets()
    const { logout } = useAuth()
    const { data: user, isLoading } = useCurrentUser()
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

    const name =
        [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
        user?.username ||
        'Resident'
    const initials = getInitials(name)
    const barangay = user?.address?.barangay?.trim()

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.surface }]}>
            <DrawerContentScrollView
                {...props}
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg }]}
            >
                {/* User info */}
                <View style={[styles.profile, { borderBottomColor: theme.colors.border }]}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                        <Text style={[styles.avatarText, { color: theme.colors.onPrimary }]}>
                            {initials}
                        </Text>
                    </View>
                    {isLoading ? (
                        <Spinner />
                    ) : (
                        <View style={styles.profileText}>
                            <Text variant="subtitle" numberOfLines={1}>
                                {name}
                            </Text>
                            {user?.phone_number ? (
                                <Text variant="caption" color="textMuted" numberOfLines={1}>
                                    {user.phone_number}
                                </Text>
                            ) : null}
                            {barangay ? (
                                <Text variant="caption" color="textMuted" numberOfLines={1}>
                                    {barangay}
                                </Text>
                            ) : null}
                        </View>
                    )}
                </View>
            </DrawerContentScrollView>

            {/* Pinned appearance toggle + sign-out */}
            <View
                style={[
                    styles.footer,
                    { borderTopColor: theme.colors.border, paddingBottom: insets.bottom + spacing.md },
                ]}
            >
                <ThemeToggleRow />

                <Pressable
                    onPress={onSignOut}
                    disabled={signingOut}
                    style={({ pressed }) => [
                        styles.item,
                        pressed && styles.itemPressed,
                        signingOut && styles.itemPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Sign out"
                >
                    <Icon name="log-out-outline" size={22} color={theme.colors.danger} />
                    <Text variant="label" color="danger" style={styles.itemLabel}>
                        {signingOut ? 'Signing out…' : 'Sign out'}
                    </Text>
                </Pressable>
            </View>
        </View>
    )
}

/**
 * Light/dark switch. The whole row is the tap target and the single accessibility
 * element — the `Switch` is decorative, so screen readers announce it once.
 */
function ThemeToggleRow() {
    const theme = useTheme()
    const { scheme, toggleScheme } = useThemeControls()
    const isDark = scheme === 'dark'

    return (
        <Pressable
            onPress={toggleScheme}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            accessibilityRole="switch"
            accessibilityLabel="Dark mode"
            accessibilityState={{ checked: isDark }}
        >
            <Icon
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={22}
                color={theme.colors.textMuted}
            />
            <Text variant="label" style={styles.itemLabel}>
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

/** Up to two initials from a display name, for the avatar. */
function getInitials(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingTop: 0 },
    profile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        marginBottom: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '700' },
    profileText: { flex: 1, gap: 2 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
    },
    itemPressed: { opacity: 0.6 },
    itemLabel: { flex: 1 },
    footer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.sm,
    },
})
