import { Modal, StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Button, Text } from '@/common/ui'

import type { Notification } from '../types'
import { NotificationDetail } from './NotificationDetail'

interface Props {
    notification: Notification | null
    onClose: () => void
}

/**
 * Full notification detail as a slide-up sheet, opened from the Alerts feed.
 * Closing it (button or Android back) pops this one layer and leaves the
 * resident on the feed they came from.
 */
export function NotificationDetailModal({ notification, onClose }: Props) {
    const theme = useTheme()

    return (
        <Modal
            visible={notification != null}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="pageSheet"
        >
            <View style={[styles.sheet, { backgroundColor: theme.colors.bg }]}>
                <View style={styles.header}>
                    <Text variant="title" style={styles.title}>
                        Alert
                    </Text>
                    <Button label="Close" variant="ghost" onPress={onClose} style={styles.close} />
                </View>

                {notification ? <NotificationDetail notification={notification} /> : null}
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    sheet: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    title: { flexShrink: 1 },
    close: { minHeight: 40, paddingHorizontal: spacing.md },
})
