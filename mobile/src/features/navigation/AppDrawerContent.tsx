import { router } from 'expo-router'
import { type DrawerContentComponentProps, DrawerContentScrollView } from 'expo-router/drawer'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, type IconName, Spinner, Text } from '@/common/ui'
import { unregisterPushDevice } from '@/features/alerts/hooks/usePushRegistration'
import { useAuth } from '@/features/auth/context/useAuth'
import { useCurrentUser } from '@/features/account/hooks/useCurrentUser'

interface NavItem {
    /** The (app) route this item points at. */
    route: '/status' | '/account' | '/toolkit'
    label: string
    icon: IconName
}

const NAV_ITEMS: NavItem[] = [
    { route: '/status', label: 'Flood status', icon: 'water-outline' },
    { route: '/account', label: 'Account settings', icon: 'settings-outline' },
    { route: '/toolkit', label: 'Disaster toolkit', icon: 'medkit-outline' },
]

/**
 * The side panel. A user-info header, the primary destinations, and a pinned
 * sign-out at the bottom. Replaces the bottom tab bar as the app's main
 * navigation surface (opened by the header hamburger or an edge swipe).
 */
export function AppDrawerContent(props: DrawerContentComponentProps) {
    const theme = useTheme()
    const insets = useSafeAreaInsets()
    const { logout } = useAuth()
    const { data: user, isLoading } = useCurrentUser()
    const [signingOut, setSigningOut] = useState(false)

    // The active drawer route (e.g. "status") so we can highlight the current item.
    const activeRoute = props.state.routeNames[props.state.index]

    const go = (route: NavItem['route']) => {
        props.navigation.closeDrawer()
        router.navigate(route)
    }

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

                {/* Primary destinations */}
                <View style={styles.nav}>
                    {NAV_ITEMS.map((item) => {
                        const active = activeRoute === item.route.slice(1)
                        return (
                            <Pressable
                                key={item.route}
                                onPress={() => go(item.route)}
                                style={({ pressed }) => [
                                    styles.item,
                                    active && { backgroundColor: theme.colors.surfaceAlt },
                                    pressed && styles.itemPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                            >
                                <Icon
                                    name={item.icon}
                                    size={22}
                                    color={active ? theme.colors.primary : theme.colors.textMuted}
                                />
                                <Text
                                    variant="label"
                                    color={active ? 'primary' : 'text'}
                                    style={styles.itemLabel}
                                >
                                    {item.label}
                                </Text>
                            </Pressable>
                        )
                    })}
                </View>
            </DrawerContentScrollView>

            {/* Pinned sign-out */}
            <View
                style={[
                    styles.footer,
                    { borderTopColor: theme.colors.border, paddingBottom: insets.bottom + spacing.md },
                ]}
            >
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
    nav: { paddingHorizontal: spacing.sm, gap: spacing.xs },
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
