import { ScrollView, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, Text } from '@/common/ui'

import type { OnboardingStep } from '../data/steps'
import { RiskLevels } from './RiskLevels'

interface Props {
    step: OnboardingStep
    width: number
}

/** One page of the tour. Scrolls vertically so long copy fits small phones. */
export function OnboardingSlide({ step, width }: Props) {
    const theme = useTheme()
    return (
        <ScrollView style={{ width }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.badge, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Icon name={step.icon} size={44} color={theme.colors.primary} />
            </View>
            <Text variant="title" style={styles.center}>
                {step.title}
            </Text>
            <Text color="textMuted" style={styles.center}>
                {step.body}
            </Text>

            {step.bullets ? (
                <View style={styles.bullets}>
                    {step.bullets.map((b) => (
                        <View key={b} style={styles.bullet}>
                            <Icon name="checkmark-circle" size={18} color={theme.colors.success} />
                            <Text style={styles.bulletText}>{b}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {step.showRiskLevels ? <RiskLevels /> : null}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    content: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, alignItems: 'center' },
    badge: { width: 96, height: 96, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
    center: { textAlign: 'center' },
    bullets: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
    bullet: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    bulletText: { flex: 1 },
})
