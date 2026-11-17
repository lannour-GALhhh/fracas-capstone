import { StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Button, Card, Icon, Text } from '@/common/ui'

import { useOnlineStatus } from './useOnlineStatus'

/**
 * Heads-up shown while the server can't be reached. The app keeps working from its
 * persisted cache, and flood alerts also go out by SMS (which needs cellular
 * reception, not mobile data), so the resident is told not to worry.
 * Renders nothing while online.
 */
export function OfflineCard() {
    const theme = useTheme()
    const { online, checking, retry } = useOnlineStatus()
    if (online) return null

    return (
        <Card style={styles.card}>
            <View style={styles.row}>
                <Icon name="cloud-offline-outline" size={20} color={theme.colors.textMuted} />
                <View style={styles.text}>
                    <Text variant="label">You&apos;re offline</Text>
                    <Text variant="caption" color="textMuted">
                        You&apos;re no longer connected to the internet, but don&apos;t worry — you&apos;ll still see
                        the latest flood risk for your location and receive SMS alerts.
                    </Text>
                </View>
            </View>
            <Button label="Retry" variant="ghost" onPress={() => void retry()} loading={checking} style={styles.btn} />
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { padding: spacing.md, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    text: { flex: 1, gap: 2 },
    btn: { minHeight: 36 },
})
