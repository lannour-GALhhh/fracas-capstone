import { StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Card, Collapsible, Icon, Spinner, Text } from '@/common/ui'
import { timeAgo } from '@/common/utils/time'
import { RAINFALL_TIER_ICONS, RAINFALL_TIER_LABELS, rainfallTier } from '@/features/gis/constants/rainfall'
import { RISK_COLORS } from '@/features/gis/constants/risk'
import { SUSCEPTIBILITY_LABELS } from '@/features/gis/constants/susceptibility'
import { useEvacuationCenters } from '@/features/gis/hooks/useEvacuationCenters'
import { useBarangayRisk } from '@/features/gis/hooks/useBarangayRisk'
import type { BarangayRisk, ZoneScore } from '@/features/gis/types'
import { ErrorState } from '@/common/components/ErrorState'

/** Format a nullable number, dropping noise digits. */
const fmt = (v: number | null | undefined): string => (v == null ? '—' : `${Math.round(v * 10) / 10}`)

/** Conditions, zone breakdown, centers and timestamps for an already-loaded barangay. */
export function BarangayDetailSections({ data, barangayId }: { data: BarangayRisk; barangayId: number | null }) {
    return (
        <>
            <Conditions data={data} />
            <ZoneBreakdown data={data} />
            <EvacuationCenters barangayId={barangayId} />
            <Footer data={data} />
        </>
    )
}

/** Self-loading detail block for the status sheet: fetches the barangay, then renders the sections. */
export function BarangayDetailPanel({ barangayId }: { barangayId: number | null }) {
    const { data, isLoading, isError, refetch } = useBarangayRisk(barangayId)
    if (barangayId == null) return null
    if (isLoading) return <Spinner />
    if (isError) {
        return (
            <ErrorState
                title="Detail unavailable"
                message="We couldn't load this barangay's risk breakdown. Try again in a moment."
                onRetry={() => refetch()}
            />
        )
    }
    if (!data) return null
    return (
        <>
            <ScoreRow data={data} />
            <BarangayDetailSections data={data} barangayId={barangayId} />
        </>
    )
}

const ScoreRow = ({ data }: { data: BarangayRisk }) => (
    <Card style={styles.scoreCard}>
        <Text variant="label">Hazard score</Text>
        <Text variant="subtitle">{data.risk_score == null ? '—' : `${Math.round(data.risk_score)} / 100`}</Text>
    </Card>
)

const Conditions = ({ data }: { data: BarangayRisk }) => {
    // Hourly values (true mm/hr): the last completed hour, and the highest of the next four.
    const hourlyForecasts = [
        data.hourly_forecast_1hr,
        data.hourly_forecast_2hr,
        data.hourly_forecast_3hr,
        data.hourly_forecast_4hr,
    ]
    const current = data.hourly_current ?? null
    let peak: number | null = null
    let peakIndex = -1
    hourlyForecasts.forEach((v, i) => {
        if (v != null && (peak == null || v > peak)) {
            peak = v
            peakIndex = i + 1
        }
    })
    const chances = data.precipitation_probability
    const currentChance = chances?.[0]
    const peakChance = peakIndex > 0 ? chances?.[peakIndex] : undefined
    const tier = rainfallTier(current)

    return (
        <View style={styles.conditions}>
            <View style={styles.tiles}>
                <StatTile label="Current rainfall" value={fmt(current)} unit="mm/hr" chance={currentChance} />
                <StatTile label="Peak forecast (4 hr)" value={fmt(peak)} unit="mm/hr" chance={peakChance} />
                <StatTile label="Accumulated (24 hr)" value={fmt(data.accumulated_24hr)} unit="mm" />
                <StatTile label="Accumulated (7 day)" value={fmt(data.accumulated_7day)} unit="mm" />
            </View>
            <RainfallStrength tier={tier} />
        </View>
    )
}

const RainfallStrength = ({ tier }: { tier: ReturnType<typeof rainfallTier> }) => {
    const theme = useTheme()
    return (
        <Card style={styles.strength}>
            <Icon name={RAINFALL_TIER_ICONS[tier]} size={22} color={theme.colors.primary} />
            <View>
                <Text variant="caption" color="textMuted">
                    Rainfall strength
                </Text>
                <Text variant="subtitle">{RAINFALL_TIER_LABELS[tier]}</Text>
            </View>
        </Card>
    )
}

const StatTile = ({
    label,
    value,
    unit,
    chance,
}: {
    label: string
    value: string
    unit: string
    chance?: number | null
}) => (
    <Card style={styles.tile}>
        <Text variant="caption" color="textMuted" style={styles.tileLabel}>
            {label}
        </Text>
        <View style={styles.tileValue}>
            <Text variant="subtitle" style={styles.tileNumber}>{value}</Text>
            <Text variant="caption" color="textMuted" style={styles.tileUnit}>
                {unit}
            </Text>
        </View>
        {chance != null && (
            <Text variant="caption" color="textMuted">
                {Math.round(chance)}% chance of rain
            </Text>
        )}
    </Card>
)

/**
 * Rainfall-gated breakdown: each susceptibility zone scores rainfall ×
 * susceptibility, and the barangay headline is their average — so a
 * high-susceptibility zone only lights up when it actually rains.
 */
const ZoneBreakdown = ({ data }: { data: BarangayRisk }) => {
    if (!data.zones?.length) return null
    return (
        <Card style={styles.breakdown}>
            <Text variant="label">Zone risk</Text>
            {data.zones.map((zone) => (
                <ZoneRow key={zone.level} zone={zone} />
            ))}
            <View style={styles.averageRow}>
                <Text variant="caption">Barangay average</Text>
                <Text variant="caption">
                    {data.average == null ? '—' : Math.round(data.average)}
                </Text>
            </View>
        </Card>
    )
}

const ZoneRow = ({ zone }: { zone: ZoneScore }) => {
    const theme = useTheme()
    return (
        <View style={styles.factor}>
            <View style={styles.factorHead}>
                <Text variant="caption">
                    {SUSCEPTIBILITY_LABELS[zone.level]}{' '}
                    <Text variant="caption" color="textMuted">
                        {Math.round(zone.share * 100)}% of area
                    </Text>
                </Text>
                <Text variant="caption">{Math.round(zone.score)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
                <View
                    style={[styles.fill, { backgroundColor: RISK_COLORS[zone.category], width: `${zone.score}%` }]}
                />
            </View>
        </View>
    )
}

/** Centers serving this barangay, tucked into a collapsible; hidden when there are none. */
const EvacuationCenters = ({ barangayId }: { barangayId: number | null }) => {
    const { data } = useEvacuationCenters()
    const centers = (data?.features ?? [])
        .map((f) => f.properties)
        .filter((c) => c.barangay === barangayId)
    if (!centers.length) return null
    return (
        <Collapsible
            title="Evacuation centers"
            subtitle={`${centers.length} in this barangay`}
            icon="home-outline"
        >
            <View style={styles.centers}>
                {centers.map((c) => (
                    <View key={c.id} style={styles.center}>
                        <Text variant="subtitle">{c.name}</Text>
                        <Text variant="caption" color="textMuted">
                            Capacity:{' '}
                            {c.capacity == null ? '—' : `${c.capacity} ${c.capacity_unit ?? ''}`.trim()}
                        </Text>
                        {c.contact ? (
                            <Text variant="caption" color="textMuted">
                                Contact: {c.contact}
                            </Text>
                        ) : null}
                    </View>
                ))}
            </View>
        </Collapsible>
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
    scoreCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    conditions: { gap: spacing.md },
    tiles: { gap: spacing.md },
    tile: { gap: spacing.xs, width: '100%' },
    tileLabel: { fontSize: 14, lineHeight: 18 },
    tileNumber: { fontSize: 20, lineHeight: 26 },
    tileUnit: { fontSize: 14, lineHeight: 18 },
    tileValue: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
    strength: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    breakdown: { gap: spacing.sm },
    factor: { gap: spacing.xs, marginTop: spacing.xs },
    factorHead: { flexDirection: 'row', justifyContent: 'space-between' },
    averageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(127,127,127,0.3)',
    },
    track: { height: 6, borderRadius: 3, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3 },
    centers: { gap: spacing.md },
    center: { gap: 2 },
    footer: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },

})
