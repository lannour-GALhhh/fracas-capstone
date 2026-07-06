import { StyleSheet, View } from 'react-native'

import { radius, spacing } from '@/common/theme'
import { Card, Text } from '@/common/ui'

import { HAZARD_LEVELS } from '../data/hazardLevels'

/**
 * Offline legend for the Status map: what each color on the low→critical ramp
 * means and the action it calls for. Shares RISK_COLORS so it never drifts.
 */
export function HazardLegend() {
    return (
        <Card style={styles.card}>
            {HAZARD_LEVELS.map((level) => (
                <View key={level.category} style={styles.row}>
                    <View style={[styles.swatch, { backgroundColor: level.color }]}>
                        <Text variant="caption" style={{ color: level.onColor, fontWeight: '700' }}>
                            {level.label}
                        </Text>
                    </View>
                    <View style={styles.text}>
                        <Text variant="body">{level.meaning}</Text>
                        <Text variant="caption" color="textMuted">
                            {level.action}
                        </Text>
                    </View>
                </View>
            ))}
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { gap: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    swatch: {
        width: 76,
        paddingVertical: spacing.sm,
        borderRadius: radius.sm,
        alignItems: 'center',
    },
    text: { flex: 1, gap: spacing.xs / 2 },
})
