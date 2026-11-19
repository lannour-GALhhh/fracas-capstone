import { StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Button, Card, Icon, Text } from '@/common/ui'

import { useAlertsOff } from '../hooks/useAlertsOff'

/**
 * Small heads-up shown while notifications are off: the resident won't get flood
 * alerts until they turn them on. Renders nothing when alerts are working.
 */
export function AlertsOffCard() {
    const theme = useTheme()
    const { off, enable, enabling } = useAlertsOff()
    if (!off) return null

    return (
        <Card style={styles.card}>
            <View style={styles.row}>
                <Icon name="notifications-off-outline" size={20} color={theme.colors.danger} />
                <Text variant="caption" style={styles.text}>
                    Notifications are off. You won't receive flood alerts until you turn them on.
                </Text>
            </View>
            <Button label="Turn on notifications" onPress={() => void enable()} loading={enabling} style={styles.btn} />
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { padding: spacing.md, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    text: { flex: 1 },
    btn: { minHeight: 40 },
})
