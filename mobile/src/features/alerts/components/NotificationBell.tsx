import { router } from 'expo-router'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { radius, spacing, useTheme } from '@/common/theme'
import { Button, Icon, Text } from '@/common/ui'

import { useNotifications } from '../hooks/useNotifications'
import { useUnreadCount } from '../hooks/useUnreadCount'
import type { Notification } from '../types'
import { NotificationDetail } from './NotificationDetail'
import { NotificationRow } from './NotificationRow'

const RECENT_LIMIT = 5

/**
 * Bell affordance for a screen header: shows the unread badge and opens a sheet
 * of the most recent alerts. Reuses the feed query (no extra request) so the
 * badge and popup stay consistent with the Alerts tab.
 *
 * The sheet is a two-layer stack — recent list, then one alert's detail — held
 * in a single `Modal` so a back press pops exactly one layer (detail → list →
 * closed) instead of dropping the resident back onto the screen underneath.
 */
export function NotificationBell() {
    const theme = useTheme()
    const insets = useSafeAreaInsets()
    const unread = useUnreadCount()
    const { notifications } = useNotifications()

    const [open, setOpen] = useState(false)
    const [detail, setDetail] = useState<Notification | null>(null)

    const count = unread.data ?? 0
    const recent = notifications.slice(0, RECENT_LIMIT)

    /** Pop one layer of the sheet: detail → list → closed. */
    const back = () => {
        if (detail) setDetail(null)
        else setOpen(false)
    }

    const seeAll = () => {
        setDetail(null)
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
                onRequestClose={back}
                presentationStyle="pageSheet"
            >
                <View style={[styles.sheet, { backgroundColor: theme.colors.bg }]}>
                    {detail ? (
                        <>
                            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                                <Pressable
                                    onPress={back}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Back to recent alerts"
                                    style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
                                >
                                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                                </Pressable>
                                <Text variant="title" style={styles.title}>
                                    Alert
                                </Text>
                            </View>

                            <NotificationDetail notification={detail} />
                        </>
                    ) : (
                        <>
                            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                                <Text variant="title">Recent alerts</Text>
                                <Button
                                    label="Close"
                                    variant="ghost"
                                    onPress={back}
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
                                        <NotificationRow key={n.id} notification={n} onPress={setDetail} />
                                    ))
                                )}
                            </ScrollView>

                            <View style={styles.footer}>
                                <Button label="See all alerts" variant="secondary" onPress={seeAll} />
                            </View>
                        </>
                    )}
                </View>
            </Modal>
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
        gap: spacing.sm,
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    backBtn: { paddingVertical: spacing.xs, marginLeft: -spacing.xs },
    pressed: { opacity: 0.5 },
    title: { flex: 1 },
    close: { minHeight: 40, paddingHorizontal: spacing.md },
    body: { padding: spacing.lg, gap: spacing.md },
    empty: { textAlign: 'center', paddingVertical: spacing.xl },
    footer: { padding: spacing.lg },
})
