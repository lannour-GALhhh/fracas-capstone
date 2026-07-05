import { Redirect, Tabs } from 'expo-router'

import { useTheme } from '@/common/theme'
import { Spinner, TabBarIcon } from '@/common/ui'
import { useAuth } from '@/features/auth/context/useAuth'

/** Signed-in tab shell. Redirects to login when there is no session. */
export default function AppLayout() {
    const { isInitializing, isAuthenticated } = useAuth()
    const theme = useTheme()

    if (isInitializing) return <Spinner />
    if (!isAuthenticated) return <Redirect href="/login" />

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
        </Tabs>
    )
}
