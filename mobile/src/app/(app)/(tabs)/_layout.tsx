import { Tabs } from 'expo-router/tabs'
import { StyleSheet, View } from 'react-native'

import { useTheme } from '@/common/theme'
import { Icon, type IconName } from '@/common/ui'
import { NotificationBell } from '@/features/alerts/components/NotificationBell'

const TAB_ICONS: Record<'status' | 'reports' | 'toolkit' | 'account', [IconName, IconName]> = {
    status: ['map', 'map-outline'],
    reports: ['camera', 'camera-outline'],
    toolkit: ['medkit', 'medkit-outline'],
    account: ['person-circle', 'person-circle-outline'],
}

function TabIcon({
    name,
    focused,
    color,
    size,
}: {
    name: keyof typeof TAB_ICONS
    focused: boolean
    color: string
    size: number
}) {
    const [active, inactive] = TAB_ICONS[name]
    return <Icon name={focused ? active : inactive} size={size} color={color} />
}

/**
 * Primary bottom-tab destinations: GIS, Notifications, Toolkit, Me.
 * Nested under the signed-in stack (`../_layout.tsx`). Dark mode and sign-out
 * live on the Me tab.
 */
export default function TabsLayout() {
    const theme = useTheme()

    return (
        <Tabs
            screenOptions={{
                headerTitle: '',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: theme.colors.bg },
                headerTintColor: theme.colors.text,
                sceneStyle: { backgroundColor: theme.colors.bg },
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
                    title: 'GIS',
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon name="status" focused={focused} color={color as string} size={size} />
                    ),
                    headerRight: () => (
                        <View style={styles.headerRight}>
                            <NotificationBell />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Reports',
                    // No header content left, so drop the empty bar; the screen insets itself.
                    headerShown: false,
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon name="reports" focused={focused} color={color as string} size={size} />
                    ),
                }}
            />
            {/* Alerts live in the header bell; the route stays for its "See all alerts" link. */}
            <Tabs.Screen name="alerts" options={{ href: null, title: 'Notifications' }} />
            <Tabs.Screen
                name="toolkit"
                options={{
                    title: 'Toolkit',
                    // No header content left, so drop the empty bar; the screen insets itself.
                    headerShown: false,
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon name="toolkit" focused={focused} color={color as string} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="account"
                options={{
                    title: 'Me',
                    // No header content left, so drop the empty bar; the screen insets itself.
                    headerShown: false,
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon name="account" focused={focused} color={color as string} size={size} />
                    ),
                }}
            />
        </Tabs>
    )
}

const styles = StyleSheet.create({
    headerRight: { marginRight: 12 },
})
