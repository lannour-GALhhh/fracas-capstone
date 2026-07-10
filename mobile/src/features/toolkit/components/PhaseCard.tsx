import { StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Card, Icon, Text } from '@/common/ui'

import type { GuidancePhase } from '../types'

interface Props {
    phase: GuidancePhase
}

/** One before/during/after guidance card: an icon header + numbered steps. */
export function PhaseCard({ phase }: Props) {
    const theme = useTheme()
    return (
        <Card style={styles.card}>
            <View style={styles.header}>
                <Icon name={phase.icon} size={22} color={theme.colors.primary} />
                <Text variant="subtitle">{phase.title}</Text>
            </View>
            {phase.steps.map((step, index) => (
                <View key={step} style={styles.step}>
                    <Text variant="body" color="textMuted" style={styles.index}>
                        {index + 1}.
                    </Text>
                    <Text variant="body" style={styles.stepText}>
                        {step}
                    </Text>
                </View>
            ))}
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { gap: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    step: { flexDirection: 'row', gap: spacing.sm },
    index: { width: 20 },
    stepText: { flex: 1 },
})
