import { Redirect, Tabs } from 'expo-router'

import { useTheme } from '@/common/theme'
import { Spinner, TabBarIcon } from '@/common/ui'
import { usePreferences } from '@/features/alerts/hooks/usePreferences'
import { usePushRegistration } from '@/features/alerts/hooks/usePushRegistration'
import { useUnreadCount } from '@/features/alerts/hooks/useUnreadCount'
import { useAuth } from '@/features/auth/context/useAuth'

/** Signed-in tab shell. Redirects to login when there is no session. */
export default function AppLayout() {
    const { isInitializing, isAuthenticated } = useAuth()

    if (isInitializing) return <Spinner />
    if (!isAuthenticated) return <Redirect href="/login" />

    return <SignedInTabs />
}

/** The authenticated chrome. Split out so its data hooks only run with a session. */
function SignedInTabs() {
    const theme = useTheme()
    const unread = useUnreadCount()
    const prefs = usePreferences()

    // Register for push whenever the resident has the channel enabled.
    usePushRegistration(Boolean(prefs.data?.push_enabled))

    const count = unread.data ?? 0
    const badge = count > 0 ? (count > 9 ? '9+' : count) : undefined

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                },
            }}
        >
            <Tabs.Screen
                name="status"
                options={{
                    title: 'Status',
                    tabBarIcon: ({ focused }) => <TabBarIcon glyph="🌊" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="alerts"
                options={{
                    title: 'Alerts',
                    tabBarBadge: badge,
                    tabBarIcon: ({ focused }) => <TabBarIcon glyph="🔔" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="toolkit"
                options={{
                    title: 'Toolkit',
                    tabBarIcon: ({ focused }) => <TabBarIcon glyph="🧰" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="account"
                options={{
                    title: 'Account',
                    tabBarIcon: ({ focused }) => <TabBarIcon glyph="👤" focused={focused} />,
                }}
            />
            {/* Reached from Account; not tabs of their own. */}
            <Tabs.Screen name="notification-settings" options={{ href: null }} />
            <Tabs.Screen name="edit-profile" options={{ href: null }} />
            <Tabs.Screen name="change-password" options={{ href: null }} />
        </Tabs>
    )
}
