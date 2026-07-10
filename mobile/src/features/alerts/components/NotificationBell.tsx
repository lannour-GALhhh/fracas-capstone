import { router } from 'expo-router'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Button, Icon, Text } from '@/common/ui'

import { useNotifications } from '../hooks/useNotifications'
import { useUnreadCount } from '../hooks/useUnreadCount'
import type { Notification } from '../types'
import { NotificationDetailModal } from './NotificationDetailModal'
import { NotificationRow } from './NotificationRow'

const RECENT_LIMIT = 5

/**
 * Bell affordance for a screen header: shows the unread badge and opens a sheet
 * of the most recent alerts. Reuses the feed query (no extra request) so the
 * badge and popup stay consistent with the Alerts tab.
 */
export function NotificationBell() {
    const theme = useTheme()
    const unread = useUnreadCount()
    const { notifications } = useNotifications()

    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState<Notification | null>(null)

    const count = unread.data ?? 0
    const recent = notifications.slice(0, RECENT_LIMIT)

    const openDetail = (notification: Notification) => {
        setOpen(false)
        setSelected(notification)
    }

    const seeAll = () => {
        setOpen(false)
        router.navigate('/alerts')
    }

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                hitSlop={8}
                style={styles.bell}
                accessibilityLabel={`Notifications${count ? `, ${count} unread` : ''}`}
            >
                <Icon name="notifications-outline" size={24} color={theme.colors.text} />
                {count > 0 ? (
                    <View style={[styles.badge, { backgroundColor: theme.colors.danger }]}>
                        <Text style={[styles.badgeText, { color: theme.colors.onDanger }]}>
                            {count > 9 ? '9+' : count}
                        </Text>
                    </View>
                ) : null}
            </Pressable>

            <Modal
                visible={open}
                animationType="slide"
                onRequestClose={() => setOpen(false)}
                presentationStyle="pageSheet"
            >
                <View style={[styles.sheet, { backgroundColor: theme.colors.bg }]}>
                    <View style={styles.header}>
                        <Text variant="title">Recent alerts</Text>
                        <Button
                            label="Close"
                            variant="ghost"
                            onPress={() => setOpen(false)}
                            style={styles.close}
                        />
                    </View>

                    <ScrollView contentContainerStyle={styles.body}>
                        {recent.length === 0 ? (
                            <Text variant="body" color="textMuted" style={styles.empty}>
                                No alerts yet. Advisories for your barangay will show up here.
                            </Text>
                        ) : (
                            recent.map((n) => (
                                <NotificationRow key={n.id} notification={n} onPress={openDetail} />
                            ))
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <Button label="See all alerts" variant="secondary" onPress={seeAll} />
                    </View>
                </View>
            </Modal>

            <NotificationDetailModal notification={selected} onClose={() => setSelected(null)} />
        </>
    )
}

const styles = StyleSheet.create({
    bell: { padding: spacing.xs },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
    sheet: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    close: { minHeight: 40, paddingHorizontal: spacing.md },
    body: { padding: spacing.lg, gap: spacing.md },
    empty: { textAlign: 'center', paddingVertical: spacing.xl },
    footer: { padding: spacing.lg },
})
