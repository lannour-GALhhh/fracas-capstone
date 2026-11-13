import { Redirect, Stack, type Href } from 'expo-router'
import { Pressable, StyleSheet } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, Spinner, Text } from '@/common/ui'
import { goBack } from '@/common/utils/navigation'
import { usePreferences } from '@/features/alerts/hooks/usePreferences'
import { usePushRegistration } from '@/features/alerts/hooks/usePushRegistration'
import { useAuth } from '@/features/auth/context/useAuth'

/** Signed-in shell. Redirects to login when there is no session. */
export default function AppLayout() {
    const { isInitializing, isAuthenticated } = useAuth()

    if (isInitializing) return <Spinner />
    if (!isAuthenticated) return <Redirect href="/login" />

    return <SignedInStack />
}

/**
 * Header back affordance for secondary screens. Mirrors the ghost "Cancel"
 * button on the Report flooding sheet — bordered, top right — with an arrow.
 */
function HeaderBackButton({ fallback, left = false }: { fallback: Href; left?: boolean }) {
    const theme = useTheme()
    return (
        <Pressable
            onPress={() => goBack(fallback)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
                styles.backBtn,
                left && styles.backLeft,
                { borderColor: theme.colors.border },
                pressed && styles.pressed,
            ]}
        >
            <Icon name="arrow-back" size={18} color={theme.colors.text} />
            <Text variant="label">Back</Text>
        </Pressable>
    )
}

/** The authenticated chrome. Split out so its data hooks only run with a session. */
function SignedInStack() {
    const theme = useTheme()
    const prefs = usePreferences()

    // Register for push whenever the resident has the channel enabled.
    usePushRegistration(Boolean(prefs.data?.push_enabled))

    // Secondary screens get a back button. The `fallback` names the screen each
    // one is opened from: there is no history when the app lands straight here
    // (push-notification tap, deep link), so without it `goBack` would have
    // nothing to pop and the button would do nothing.
    const secondary = (fallback: Href) => ({
        headerRight: () => <HeaderBackButton fallback={fallback} />,
    })
    // Report detail keeps the original top-left pill.
    const secondaryLeft = (fallback: Href) => ({
        headerLeft: () => <HeaderBackButton fallback={fallback} left />,
    })

    return (
        <Stack
            screenOptions={{
                headerTitle: '',
                headerBackVisible: false,
                headerShadowVisible: false,
                headerStyle: { backgroundColor: theme.colors.bg },
                headerTintColor: theme.colors.text,
                contentStyle: { backgroundColor: theme.colors.bg },
            }}
        >
            {/* The bottom-tab group (GIS, Reports, Toolkit, Me) draws its own header. */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="notification-settings" options={secondary('/account')} />
            <Stack.Screen name="edit-profile" options={secondary('/account')} />
            <Stack.Screen name="change-password" options={secondary('/account')} />
            <Stack.Screen name="report/[id]" options={secondaryLeft('/reports')} />
        </Stack>
    )
}

const styles = StyleSheet.create({
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 40,
        marginRight: spacing.lg,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderRadius: radius.md,
    },
    backLeft: { marginRight: 0, marginLeft: spacing.lg },
    pressed: { opacity: 0.6 },
})
