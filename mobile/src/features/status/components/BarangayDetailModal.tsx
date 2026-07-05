import { Modal, ScrollView, StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Badge, Button, Card, Spinner, Text } from '@/common/ui'
import { ErrorState } from '@/common/components/ErrorState'
import { timeAgo } from '@/common/utils/time'
import { CATEGORY_LABELS, RISK_COLORS } from '@/features/gis/constants/risk'
import { useBarangayRisk } from '@/features/gis/hooks/useBarangayRisk'
import type { BarangayRisk, RiskCategory, RiskFactorBreakdown } from '@/features/gis/types'

interface Props {
    barangayId: number | null
    onClose: () => void
}

const FACTOR_LABELS: Record<string, string> = {
    rainfall: 'Rainfall',
    dam: 'Dam / river stage',
    vulnerability: 'Terrain vulnerability',
}

const badgeTextColor = (c: RiskCategory): string =>
    c === 'high' || c === 'critical' ? '#ffffff' : '#3f0a0a'

/** Format a nullable number, dropping noise digits. */
const fmt = (v: number | null | undefined): string => (v == null ? '—' : `${Math.round(v * 10) / 10}`)

/** A barangay's full explainable risk breakdown, shown as a slide-up modal. */
export function BarangayDetailModal({ barangayId, onClose }: Props) {
    const { data, isLoading, isError, refetch } = useBarangayRisk(barangayId)
    const theme = useTheme()

    return (
        <Modal
            visible={barangayId != null}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="pageSheet"
        >
            <View style={[styles.sheet, { backgroundColor: theme.colors.bg }]}>
                <View style={styles.header}>
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
                        <Conditions data={data} />
                        {data.breakdown ? <Breakdown breakdown={data.breakdown} /> : null}
                        <Footer data={data} />
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
            {data.is_degraded ? (
                <Text variant="caption" color="danger">
                    Degraded — some inputs were stale; weights were redistributed.
                </Text>
            ) : null}
        </Card>
    )
}

const Conditions = ({ data }: { data: BarangayRisk }) => {
    const roc = data.rainfall_rate_change
    const forecasts = [
        data.rainfall_forecast_1hr,
        data.rainfall_forecast_2hr,
        data.rainfall_forecast_3hr,
        data.rainfall_forecast_4hr,
    ].filter((v): v is number => v != null)
    const peak = forecasts.length ? Math.max(...forecasts) : null

    return (
        <View style={styles.tiles}>
            <StatTile label="Current rainfall" value={fmt(data.current_rainfall)} unit="mm/hr" />
            <StatTile
                label="Rate of change"
                value={roc == null ? '—' : `${roc > 0 ? '+' : ''}${fmt(roc)}`}
                unit="mm/hr"
            />
            <StatTile label="Peak forecast (4 hr)" value={fmt(peak)} unit="mm/hr" />
            <StatTile label="Accumulated (24 hr)" value={fmt(data.accumulated_24hr)} unit="mm" />
        </View>
    )
}

const StatTile = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
    <Card style={styles.tile}>
        <Text variant="caption" color="textMuted">
            {label}
        </Text>
        <View style={styles.tileValue}>
            <Text variant="subtitle">{value}</Text>
            <Text variant="caption" color="textMuted">
                {unit}
            </Text>
        </View>
    </Card>
)

const Breakdown = ({ breakdown }: { breakdown: Record<string, RiskFactorBreakdown> }) => {
    const entries = Object.entries(breakdown)
    const availableWeight = entries.reduce((sum, [, f]) => sum + (f.available ? f.raw_weight : 0), 0)

    return (
        <Card style={styles.breakdown}>
            <Text variant="label">Why this score</Text>
            <Text variant="caption" color="textMuted">
                Each input scored 0–100, blended by weight.
            </Text>
            {entries.map(([name, factor]) => (
                <FactorRow
                    key={name}
                    name={name}
                    factor={factor}
                    effectiveWeight={availableWeight > 0 ? factor.raw_weight / availableWeight : 0}
                />
            ))}
        </Card>
    )
}

const FactorRow = ({
    name,
    factor,
    effectiveWeight,
}: {
    name: string
    factor: RiskFactorBreakdown
    effectiveWeight: number
}) => {
    const theme = useTheme()
    return (
        <View style={styles.factor}>
            <View style={styles.factorHead}>
                <Text variant="caption">
                    {FACTOR_LABELS[name] ?? name}{' '}
                    <Text variant="caption" color="textMuted">
                        {factor.available ? `${Math.round(effectiveWeight * 100)}% weight` : 'redistributed'}
                    </Text>
                </Text>
                <Text variant="caption" color={factor.available ? 'text' : 'textMuted'}>
                    {factor.available ? Math.round(factor.value * 100) : 'no data'}
                </Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
                <View
                    style={[
                        styles.fill,
                        {
                            backgroundColor: theme.colors.text,
                            width: `${factor.available ? factor.value * 100 : 0}%`,
                        },
                    ]}
                />
            </View>
        </View>
    )
}

const Footer = ({ data }: { data: BarangayRisk }) => {
    const scored = timeAgo(data.computed_at)
    const read = timeAgo(data.recorded_at)
    if (!scored && !read) return null
    return (
        <View style={styles.footer}>
            {scored ? (
                <Text variant="caption" color="textMuted">
                    Scored {scored}
                </Text>
            ) : null}
            {read ? (
                <Text variant="caption" color="textMuted">
                    Rainfall read {read}
                </Text>
            ) : null}
        </View>
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
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    tile: { gap: spacing.xs, flexGrow: 1, flexBasis: '45%' },
    tileValue: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
    breakdown: { gap: spacing.sm },
    factor: { gap: spacing.xs, marginTop: spacing.xs },
    factorHead: { flexDirection: 'row', justifyContent: 'space-between' },
    track: { height: 6, borderRadius: 3, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3 },
    footer: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },
})
