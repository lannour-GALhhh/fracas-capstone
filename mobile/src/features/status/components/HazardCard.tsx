import { Pressable, StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Badge, Card, Text } from '@/common/ui'
import { CATEGORY_LABELS, RISK_COLORS } from '@/features/gis/constants/risk'
import type { RiskCategory, RiskFeature } from '@/features/gis/types'

interface Props {
    /** Context label, e.g. "You are here" or "Home". */
    label: string
    feature: RiskFeature | null
    /** Shown in place of the score when there is no feature to display. */
    emptyMessage: string
    onPress?: (id: number) => void
}

/** Deep-red categories need light text; the pale ones read better on dark. */
const badgeTextColor = (category: RiskCategory): string =>
    category === 'high' || category === 'critical' ? '#ffffff' : '#3f0a0a'

/** A barangay's hazard at a glance: score / 100 + category badge. Tap for detail. */
export function HazardCard({ label, feature, emptyMessage, onPress }: Props) {
    if (!feature) {
        return (
            <Card style={styles.card}>
                <Text variant="label" color="textMuted">
                    {label}
                </Text>
                <Text variant="body" color="textMuted">
                    {emptyMessage}
                </Text>
            </Card>
        )
    }

    const { id, name, category, score, is_degraded } = feature.properties

    const body = (
        <Card style={styles.card}>
            <View style={styles.header}>
                <View style={styles.heading}>
                    <Text variant="label" color="textMuted">
                        {label}
                    </Text>
                    <Text variant="subtitle">{name}</Text>
                </View>
                <Badge
                    label={category ? CATEGORY_LABELS[category] : 'No data'}
                    color={category ? RISK_COLORS[category] : undefined}
                    textColor={category ? badgeTextColor(category) : undefined}
                />
            </View>

            <View style={styles.scoreRow}>
                <Text style={styles.score}>{score == null ? '—' : Math.round(score)}</Text>
                <Text variant="caption" color="textMuted">
                    / 100
                </Text>
            </View>

            {is_degraded ? (
                <Text variant="caption" color="danger">
                    Degraded — some inputs were stale; weights were redistributed.
                </Text>
            ) : null}
        </Card>
    )

    if (!onPress) return body
    return (
        <Pressable onPress={() => onPress(id)} accessibilityRole="button">
            {({ pressed }) => <View style={pressed && styles.pressed}>{body}</View>}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    card: { gap: spacing.sm },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
    heading: { gap: spacing.xs, flexShrink: 1 },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
    score: { fontSize: 40, fontWeight: '700', lineHeight: 44 },
    pressed: { opacity: 0.7 },
})
