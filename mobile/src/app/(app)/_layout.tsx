import { Redirect, router } from 'expo-router'
import { Drawer } from 'expo-router/drawer'
import { Pressable, StyleSheet } from 'react-native'

import { useTheme } from '@/common/theme'
import { Icon, type IconName, Spinner } from '@/common/ui'
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

/** A round-tap header button (hamburger / back). */
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

/** The authenticated chrome. Split out so its data hooks only run with a session. */
function SignedInDrawer() {
    const theme = useTheme()
    const prefs = usePreferences()

    // Register for push whenever the resident has the channel enabled.
    usePushRegistration(Boolean(prefs.data?.push_enabled))

    // Secondary screens (reached from a drawer destination) get a back arrow and
    // no edge-swipe, so the gesture is reserved for opening the drawer up top.
    const secondary = {
        headerLeft: () => (
            <HeaderButton icon="arrow-back" label="Go back" onPress={() => router.back()} />
        ),
        swipeEnabled: false,
    }

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
            <Drawer.Screen name="status" />
            <Drawer.Screen name="account" />
            <Drawer.Screen name="toolkit" />
            <Drawer.Screen name="alerts" options={secondary} />
            <Drawer.Screen name="notification-settings" options={secondary} />
            <Drawer.Screen name="edit-profile" options={secondary} />
            <Drawer.Screen name="change-password" options={secondary} />
        </Drawer>
    )
}

const styles = StyleSheet.create({
    headerBtn: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
})
