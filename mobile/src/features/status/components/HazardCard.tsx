import { Pressable, StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Card, Icon, Text } from '@/common/ui'
import { CATEGORY_LABELS } from '@/features/gis/constants/risk'
import type { RiskFeature } from '@/features/gis/types'

interface Props {
    /** Context label, e.g. "Current location" or "Home". */
    label: string
    feature: RiskFeature | null
    /** Shown in place of the score when there is no feature to display. */
    emptyMessage: string
    /** When set, shows a "View Hazard Detail" button that opens the breakdown. */
    onPress?: (id: number) => void
    /** When set, shows a "Center map here" button that focuses the map on this barangay. */
    onFocus?: () => void
}

/**
 * A barangay's hazard at a glance: the location on the left, its risk
 * category on the right, and optional actions (center the map, open the full
 * breakdown) beneath.
 */
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

    const { id, name, category, is_degraded } = feature.properties

    return (
        <Card style={styles.card}>
            <View style={styles.topRow}>
                <View style={styles.leftCol}>
                    <Text variant="label" color="textMuted">
                        {label}
                    </Text>
                    <Text variant="subtitle">{name}</Text>
                    {is_degraded ? (
                        <Text variant="caption" color="danger">
                            Degraded — some inputs were stale; weights were redistributed.
                        </Text>
                    ) : null}
                </View>

                <View style={styles.rightCol}>
                    <Text style={styles.category}>{category ? CATEGORY_LABELS[category] : 'No data'}</Text>
                    <Text variant="caption" color="textMuted">
                        Flood risk
                    </Text>
                </View>
            </View>

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

            {onPress ? (
                <Pressable
                    onPress={() => onPress(id)}
                    accessibilityRole="button"
                    accessibilityLabel={`View hazard detail for ${name}`}
                    style={({ pressed }) => [
                        styles.detailBtn,
                        { backgroundColor: theme.colors.primary },
                        pressed && styles.pressed,
                    ]}
                >
                    <Icon name="information-circle-outline" size={16} color={theme.colors.onPrimary} />
                    <Text variant="label" style={{ color: theme.colors.onPrimary }}>
                        View Hazard Detail
                    </Text>
                </Pressable>
            ) : null}
        </Card>
    )
}

const styles = StyleSheet.create({
    card: {
        gap: spacing.md,
        boxShadow: '0px 4px 2px rgba(0, 0, 0, 0.05)',
        borderWidth: 0,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    leftCol: { flex: 1, gap: spacing.xs },
    rightCol: { alignItems: 'center', gap: 2 },
    category: { fontSize: 18, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    pressed: { opacity: 0.7 },
    focusBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: 'white',
    },
    detailBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: 10,
    },
})
