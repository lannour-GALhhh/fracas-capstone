import { useNavigation } from 'expo-router'
import { Tabs } from 'expo-router/tabs'
import { Pressable, StyleSheet, View } from 'react-native'

import { useTheme } from '@/common/theme'
import { Icon, type IconName } from '@/common/ui'
import { NotificationBell } from '@/features/alerts/components/NotificationBell'
import { useUnreadCount } from '@/features/alerts/hooks/useUnreadCount'

/** The one navigator that exposes `openDrawer` — the outer root drawer. */
type DrawerNavigation = { openDrawer: () => void }

/** Hamburger button — opens the root drawer (dark mode, sign-out), one level up. */
function MenuButton() {
    const theme = useTheme()
    const navigation = useNavigation()

    return (
        <Pressable
            onPress={() => (navigation.getParent() as DrawerNavigation | undefined)?.openDrawer()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.5 }]}
        >
            <Icon name="menu" size={24} color={theme.colors.text} />
        </Pressable>
    )
}

const TAB_ICONS: Record<'status' | 'alerts' | 'toolkit' | 'account', [IconName, IconName]> = {
    status: ['map', 'map-outline'],
    alerts: ['notifications', 'notifications-outline'],
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
 * Nested one level under the root drawer (`../_layout.tsx`), which still holds
 * dark mode + sign-out and is reachable from the hamburger button here.
 */
export default function TabsLayout() {
    const theme = useTheme()
    const unread = useUnreadCount()
    const unreadCount = unread.data ?? 0

    return (
        <Tabs
            screenOptions={{
                headerTitle: '',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: theme.colors.bg },
                headerTintColor: theme.colors.text,
                headerLeft: () => <MenuButton />,
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
                name="alerts"
                options={{
                    title: 'Notifications',
                    tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon name="alerts" focused={focused} color={color as string} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="toolkit"
                options={{
                    title: 'Toolkit',
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon name="toolkit" focused={focused} color={color as string} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="account"
                options={{
                    title: 'Me',
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon name="account" focused={focused} color={color as string} size={size} />
                    ),
                }}
            />
        </Tabs>
    )
}

const styles = StyleSheet.create({
    headerBtn: { paddingHorizontal: 16, paddingVertical: 4 },
    headerRight: { marginRight: 12 },
})
