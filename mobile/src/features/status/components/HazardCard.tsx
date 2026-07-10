import { Pressable, StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Badge, Card, Icon, Text } from '@/common/ui'
import { CATEGORY_LABELS, RISK_COLORS } from '@/features/gis/constants/risk'
import type { RiskCategory, RiskFeature } from '@/features/gis/types'

interface Props {
    /** Context label, e.g. "Current location" or "Home". */
    label: string
    feature: RiskFeature | null
    /** Shown in place of the score when there is no feature to display. */
    emptyMessage: string
    onPress?: (id: number) => void
    /** When set, shows a "Center map here" button that focuses the map on this barangay. */
    onFocus?: () => void
}

/** Deep-red categories need light text; the pale ones read better on dark. */
const badgeTextColor = (category: RiskCategory): string =>
    category === 'high' || category === 'critical' ? '#ffffff' : '#3f0a0a'

/** A barangay's hazard at a glance: score / 100 + category badge. Tap for detail. */
export function HazardCard({ label, feature, emptyMessage, onPress, onFocus }: Props) {
    const theme = useTheme()
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

            {onFocus ? (
                <Pressable
                    onPress={onFocus}
                    accessibilityRole="button"
                    accessibilityLabel={`Center map on ${name}`}
                    style={({ pressed }) => [
                        styles.focusBtn,
                        { borderColor: theme.colors.border },
                        pressed && styles.pressed,
                    ]}
                >
                    <Icon name="locate" size={16} color={theme.colors.primary} />
                    <Text variant="label" color="primary">
                        Center map here
                    </Text>
                </Pressable>
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
    card: { gap: spacing.sm, boxShadow: "0px 4px 2px rgba(0, 0, 0, 0.05)", borderColor: 'rgba(0, 0, 0, 0.1)', borderWidth: 2  },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
    heading: { gap: spacing.xs, flexShrink: 1 },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
    score: { fontSize: 40, fontWeight: '700', lineHeight: 44 },
    pressed: { opacity: 0.7 },
    focusBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: "white"
    },
})
