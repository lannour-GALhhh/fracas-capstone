import { StyleSheet, View } from 'react-native'

import { RISK_COLORS, radius, spacing, useTheme } from '@/common/theme'
import { Text } from '@/common/ui'

const LEVELS = [
    { key: 'low', label: 'Low', action: 'Keep monitoring' },
    { key: 'medium', label: 'Medium', action: 'Stay alert, review the steps' },
    { key: 'high', label: 'High', action: 'Pack your go-bag, know your route' },
    { key: 'critical', label: 'Critical', action: 'Evacuate to the nearest center' },
] as const

/** Colour legend + the action each risk level calls for. */
export function RiskLevels() {
    const theme = useTheme()
    return (
        <View style={styles.list}>
            {LEVELS.map((l) => (
                <View key={l.key} style={styles.row}>
                    <View
                        style={[styles.swatch, { backgroundColor: RISK_COLORS[l.key], borderColor: theme.colors.border }]}
                    />
                    <Text variant="label" style={styles.name}>
                        {l.label}
                    </Text>
                    <Text variant="caption" color="textMuted" style={styles.action}>
                        {l.action}
                    </Text>
                </View>
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    list: { gap: spacing.sm, marginTop: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    swatch: { width: 22, height: 22, borderRadius: radius.sm, borderWidth: 1 },
    name: { width: 64 },
    action: { flex: 1 },
})
