import { Redirect, type Href } from 'expo-router'
import { Drawer } from 'expo-router/drawer'
import { Pressable, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, type IconName, Spinner, Text } from '@/common/ui'
import { goBack } from '@/common/utils/navigation'
import { NotificationBell } from '@/features/alerts/components/NotificationBell'
import { usePreferences } from '@/features/alerts/hooks/usePreferences'
import { usePushRegistration } from '@/features/alerts/hooks/usePushRegistration'
import { useAuth } from '@/features/auth/context/useAuth'
import { AppDrawerContent } from '@/features/navigation/AppDrawerContent'

/** Signed-in shell. Redirects to login when there is no session. */
export default function AppLayout() {
    const { isInitializing, isAuthenticated } = useAuth()

    if (isInitializing) return <Spinner />
    if (!isAuthenticated) return <Redirect href="/login" />

    return <SignedInDrawer />
}

/** A bare icon header button (hamburger). */
function HeaderButton({
    icon,
    onPress,
    label,
}: {
    icon: IconName
    onPress: () => void
    label: string
}) {
    const theme = useTheme()
    return (
        <Pressable
            onPress={onPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.5 }]}
        >
            <Icon name={icon} size={24} color={theme.colors.text} />
        </Pressable>
    )
}

/**
 * Header back affordance for secondary screens. Reads as a real button — a
 * bordered pill with a label — because it is the only way back on those screens
 * (they no longer carry an in-body "Back" button).
 */
function HeaderBackButton({ fallback }: { fallback: Href }) {
    const theme = useTheme()
    return (
        <Pressable
            onPress={() => goBack(fallback)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
                styles.backBtn,
                {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.border,
                },
                pressed && styles.pressed,
            ]}
        >
            <Icon name="arrow-back" size={18} color={theme.colors.text} />
            <Text variant="label">Back</Text>
        </Pressable>
    )
}

/** The authenticated chrome. Split out so its data hooks only run with a session. */
function SignedInDrawer() {
    const theme = useTheme()
    const prefs = usePreferences()

    // Register for push whenever the resident has the channel enabled.
    usePushRegistration(Boolean(prefs.data?.push_enabled))

    // Secondary screens (reached from a drawer destination) get a back button and
    // no edge-swipe, so the gesture is reserved for opening the drawer up top.
    // The `fallback` names the screen each one is opened from: the drawer keeps no
    // stack when the app lands straight here (push-notification tap, deep link),
    // so without it `goBack` would have nothing to pop and the button would do
    // nothing.
    const secondary = (fallback: Href) => ({
        headerLeft: () => <HeaderBackButton fallback={fallback} />,
        swipeEnabled: false,
    })

    return (
        <Drawer
            drawerContent={(props) => <AppDrawerContent {...props} />}
            screenOptions={({ navigation }) => ({
                headerTitle: '',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: theme.colors.bg },
                headerTintColor: theme.colors.text,
                sceneStyle: { backgroundColor: theme.colors.bg },
                drawerType: 'front',
                swipeEdgeWidth: 64,
                headerLeft: () => (
                    <HeaderButton
                        icon="menu"
                        label="Open menu"
                        onPress={() => navigation.openDrawer()}
                    />
                ),
            })}
        >
            <Drawer.Screen
                name="status"
                options={{
                    headerRight: () => (
                        <View style={styles.headerRight}>
                            <NotificationBell />
                        </View>
                    ),
                }}
            />
            <Drawer.Screen name="account" />
            <Drawer.Screen name="toolkit" />
            <Drawer.Screen name="alerts" options={secondary('/status')} />
            <Drawer.Screen name="notification-settings" options={secondary('/account')} />
            <Drawer.Screen name="edit-profile" options={secondary('/account')} />
            <Drawer.Screen name="change-password" options={secondary('/account')} />
        </Drawer>
    )
}

const styles = StyleSheet.create({
    headerBtn: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 36,
        marginLeft: spacing.lg,
        paddingLeft: spacing.sm,
        paddingRight: spacing.md,
        borderWidth: 1,
        borderRadius: radius.pill,
    },
    pressed: { opacity: 0.6 },
    headerRight: {
        marginRight: 12,
    },
})
