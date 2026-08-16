import { useEffect } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Badge, Card, Text } from '@/common/ui'
import { timeAgo } from '@/common/utils/time'

import { CATEGORY_LABELS, RISK_COLORS, categoryTextColor } from '../constants'
import { useMarkRead } from '../hooks/useNotificationMutations'
import type { Notification } from '../types'

/**
 * One advisory in full, and nothing else — no chrome, no dismissal.
 *
 * Kept presentational so the same body serves both places an alert can be
 * opened: the standalone sheet on the Alerts feed, and the second layer of the
 * header bell's sheet. The container owns how it is closed.
 */
export function NotificationDetail({ notification }: { notification: Notification }) {
    const markRead = useMarkRead()

    useEffect(() => {
        if (!notification.is_read) markRead.mutate(notification.id)
        // Mark once per opened notification; the mutation itself is stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notification.id])

    return (
        <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.meta}>
                <Badge
                    label={CATEGORY_LABELS[notification.category]}
                    color={RISK_COLORS[notification.category]}
                    textColor={categoryTextColor(notification.category)}
                />
                <Text variant="caption" color="textMuted">
                    {timeAgo(notification.created_at)}
                </Text>
            </View>

            <Text variant="subtitle">{notification.title}</Text>
            {notification.barangay_name ? (
                <Text variant="caption" color="textMuted">
                    {notification.barangay_name}
                </Text>
            ) : null}

            <Card>
                <Text variant="body">{notification.body}</Text>
            </Card>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    body: { padding: spacing.lg, gap: spacing.md },
    meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
})
