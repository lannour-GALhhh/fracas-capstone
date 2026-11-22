import { Redirect, Stack, type Href } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { BackArrow } from '@/common/components/BackArrow'
import { spacing, useTheme } from '@/common/theme'
import { Spinner, Text } from '@/common/ui'
import { goBack } from '@/common/utils/navigation'
import { useAutoSubscribeHome } from '@/features/alerts/hooks/useHomeSubscription'
import { usePreferences } from '@/features/alerts/hooks/usePreferences'
import { usePushRegistration } from '@/features/alerts/hooks/usePushRegistration'
import { useAuth } from '@/features/auth/context/useAuth'
import { useFirstRunOnboarding } from '@/features/onboarding/useFirstRunOnboarding'

/** Signed-in shell. Redirects to login when there is no session. */
export default function AppLayout() {
    const { isInitializing, isAuthenticated } = useAuth()

    if (isInitializing) return <Spinner />
    if (!isAuthenticated) return <Redirect href="/login" />

    return <SignedInStack />
}

/** The authenticated chrome. Split out so its data hooks only run with a session. */
function SignedInStack() {
    const theme = useTheme()
    const prefs = usePreferences()

    // Register for push whenever the resident has the channel enabled.
    usePushRegistration(Boolean(prefs.data?.push_enabled))

    // Alerts for the home barangay are on by default.
    useAutoSubscribeHome()

    // First launch on this device: walk the resident through the tour.
    useFirstRunOnboarding()

    // Secondary screens get a back button. The `fallback` names the screen each
    // one is opened from: there is no history when the app lands straight here
    // (push-notification tap, deep link), so without it `goBack` would have
    // nothing to pop and the button would do nothing.
    // An optional `title` sits directly beside the arrow.
    const secondary = (fallback: Href, title?: string) => ({
        headerLeft: () => (
            <View style={styles.left}>
                <BackArrow onPress={() => goBack(fallback)} />
                {title ? <Text variant="title">{title}</Text> : null}
            </View>
        ),
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
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="notification-settings" options={secondary('/account', 'Notifications')} />
            <Stack.Screen name="edit-profile" options={secondary('/account', 'Edit profile')} />
            <Stack.Screen name="change-password" options={secondary('/account', 'Change password')} />
            <Stack.Screen name="report/[id]" options={secondary('/reports')} />
            <Stack.Screen name="forecast/[id]" options={secondary('/status')} />
        </Stack>
    )
}

const styles = StyleSheet.create({
    left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.md },
})
