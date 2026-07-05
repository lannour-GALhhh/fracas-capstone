import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Badge, Card, Text } from '@/common/ui'
import { RISK_COLORS } from '@/features/gis/constants/risk'
import type { DamStatus } from '@/features/gis/types'

interface Props {
    data: DamStatus | undefined
    isLoading: boolean
}

/** How close the level sits between normal and critical, as a 0–100%. */
const criticalRatio = (d: DamStatus): number | null => {
    if (d.current_level == null || d.normal_level == null || d.critical_level == null) return null
    const span = d.critical_level - d.normal_level
    if (span <= 0) return null
    return Math.max(0, Math.min(100, ((d.current_level - d.normal_level) / span) * 100))
}

/** Pasonanca dam level vs its normal/critical thresholds. Ported from the web widget. */
export function DamStatusCard({ data, isLoading }: Props) {
    const title = (
        <Text variant="label" color="textMuted">
            Pasonanca dam status
        </Text>
    )

    if (isLoading || !data) {
        return (
            <Card style={styles.card}>
                {title}
                <Text variant="body" color="textMuted">
                    {isLoading ? 'Loading…' : 'Unavailable'}
                </Text>
            </Card>
        )
    }

    if (!data.has_data) {
        return (
            <Card style={styles.card}>
                {title}
                <Text variant="body" color="textMuted">
                    No readings yet.
                </Text>
            </Card>
        )
    }

    const ratio = criticalRatio(data)

    return (
        <Card style={styles.card}>
            <View style={styles.header}>
                {title}
                {data.is_spilling ? (
                    <Badge label="Spilling" color={RISK_COLORS.critical} textColor="#ffffff" />
                ) : null}
            </View>

            <Text variant="subtitle">
                {ratio == null ? 'Level unavailable' : `${ratio.toFixed(0)}% toward critical`}
            </Text>

            <View style={styles.stats}>
                <Stat label="Current / Critical" value={`${data.current_level} / ${data.critical_level}`} unit="m" />
                <Stat label="Rate of change" value={`${data.rate_of_change ?? '—'}`} unit="m/hr" />
            </View>
        </Card>
    )
}

const Stat = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
    <View style={styles.stat}>
        <Text variant="caption" color="textMuted">
            {label}
        </Text>
        <View style={styles.statValue}>
            <Text variant="subtitle">{value}</Text>
            <Text variant="caption" color="textMuted">
                {unit}
            </Text>
        </View>
    </View>
)

const styles = StyleSheet.create({
    card: { gap: spacing.sm },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stats: { flexDirection: 'row', gap: spacing.xl },
    stat: { gap: spacing.xs },
    statValue: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
})
