import { Modal, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spacing, useTheme } from '@/common/theme'
import { Badge, Button, Card, Spinner, Text } from '@/common/ui'
import { ErrorState } from '@/common/components/ErrorState'
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, RISK_COLORS } from '@/features/gis/constants/risk'
import { useBarangayRisk } from '@/features/gis/hooks/useBarangayRisk'
import type { BarangayRisk, RiskCategory } from '@/features/gis/types'

import { BarangayDetailSections } from './BarangayDetailSections'

interface Props {
    barangayId: number | null
    onClose: () => void
}

const badgeTextColor = (c: RiskCategory): string =>
    c === 'high' || c === 'critical' ? '#ffffff' : '#3f0a0a'

/** A barangay's full explainable risk breakdown, shown as a slide-up modal. */
export function BarangayDetailModal({ barangayId, onClose }: Props) {
    const { data, isLoading, isError, refetch } = useBarangayRisk(barangayId)
    const theme = useTheme()
    const insets = useSafeAreaInsets()

    return (
        <Modal
            visible={barangayId != null}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="pageSheet"
        >
            <View style={[styles.sheet, { backgroundColor: theme.colors.bg }]}>
                <View style={[styles.header, { paddingTop: spacing.lg + insets.top }]}>
                    <Text variant="title" style={styles.title}>
                        {data?.name ?? 'Barangay'}
                    </Text>
                    <Button label="Close" variant="ghost" onPress={onClose} style={styles.close} />
                </View>

                {isLoading ? <Spinner /> : null}
                {isError ? (
                    <ErrorState
                        title="Detail unavailable"
                        message="We couldn't load this barangay's risk breakdown. Try again in a moment."
                        onRetry={() => refetch()}
                    />
                ) : null}

                {data ? (
                    <ScrollView contentContainerStyle={styles.body}>
                        <HazardHero data={data} />
                        <BarangayDetailSections data={data} barangayId={barangayId} onBeforeNavigate={onClose} />
                    </ScrollView>
                ) : null}
            </View>
        </Modal>
    )
}

const HazardHero = ({ data }: { data: BarangayRisk }) => {
    const category = data.status
    return (
        <Card style={styles.hero}>
            <View style={styles.heroRow}>
                <View style={styles.scoreRow}>
                    <Text style={styles.score}>
                        {data.risk_score == null ? '—' : Math.round(data.risk_score)}
                    </Text>
                    <Text variant="caption" color="textMuted">
                        / 100
                    </Text>
                </View>
                <Badge
                    label={category ? CATEGORY_LABELS[category] : 'No data'}
                    color={category ? RISK_COLORS[category] : undefined}
                    textColor={category ? badgeTextColor(category) : undefined}
                />
            </View>
            <Text variant="caption" color="textMuted">
                {category
                    ? CATEGORY_DESCRIPTIONS[category]
                    : 'Risk level unavailable — no recent score for this barangay.'}
            </Text>
            {data.is_degraded ? (
                <Text variant="caption" color="danger">
                    Degraded — some inputs were stale; weights were redistributed.
                </Text>
            ) : null}
        </Card>
    )
}

const styles = StyleSheet.create({
    sheet: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    title: { flexShrink: 1 },
    close: { minHeight: 40, paddingHorizontal: spacing.md },
    body: { padding: spacing.lg, gap: spacing.lg },
    hero: { gap: spacing.sm },
    heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
    score: { fontSize: 40, fontWeight: '700', lineHeight: 44 },
})
