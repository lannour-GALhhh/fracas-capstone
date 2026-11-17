import { StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Card, Icon, Text } from '@/common/ui'

import { useMyReportBlock } from '../hooks/useMyReportBlock'

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const DAY_MS = 86_400_000

/** "permanently", "for N more day(s)" when under 7 days remain, else "until <date>". */
const describeDuration = (permanent: boolean, until: string | null): string => {
    if (permanent || !until) return 'permanently'
    const days = Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / DAY_MS))
    if (days < 7) return `for ${days} more day${days === 1 ? '' : 's'}`
    return `until ${formatDate(until)}`
}

/** Small notice shown while an operator has blocked this resident from sending reports. */
export function ReportBlockedCard() {
    const theme = useTheme()
    const { data } = useMyReportBlock()
    if (!data?.blocked) return null

    const duration = describeDuration(data.permanent, data.until)

    return (
        <Card style={styles.card}>
            <View style={styles.row}>
                <Icon name="ban-outline" size={20} color={theme.colors.danger} />
                <View style={styles.text}>
                    <Text variant="label">Reporting is blocked</Text>
                    <Text variant="caption" color="textMuted">
                        {`You are blocked from sending flood reports ${duration}. Alerts and the rest of the app still work.`}
                    </Text>
                    {data.reason ? (
                        <Text variant="caption" color="textMuted">{`Reason: ${data.reason}`}</Text>
                    ) : null}
                </View>
            </View>
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { padding: spacing.md },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    text: { flex: 1, gap: spacing.xs },
})
