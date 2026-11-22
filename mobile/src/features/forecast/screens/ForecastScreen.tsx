import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { ErrorState } from '@/common/components/ErrorState'
import { spacing, useTheme } from '@/common/theme'
import { Card, Screen, Spinner, Text } from '@/common/ui'

import { BarangayPicker } from '../components/BarangayPicker'
import { ForecastChart } from '../components/ForecastChart'
import { BAND_COLORS, BAND_LABELS } from '../constants'
import { useRainfallForecast } from '../hooks/useRainfallForecast'
import type { RainfallForecast } from '../types'
import { headline, shortDate, whenLabel } from '../utils'

/** Rainfall forecast for a barangay, now through 11 PM tomorrow. Information only — not a flood warning. */
export function ForecastScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const [barangayId, setBarangayId] = useState<number | null>(Number(id) || null)
    const { data, isLoading, isError, refetch } = useRainfallForecast(barangayId)

    return (
        <Screen edges={['bottom']}>
            <View style={styles.stack}>
                <BarangayPicker selectedId={barangayId} onSelect={setBarangayId} />
                {isLoading ? <Spinner /> : null}
                {isError ? (
                    <ErrorState
                        title="Forecast unavailable"
                        message="We couldn't load the rainfall forecast. Try again in a moment."
                        onRetry={() => void refetch()}
                    />
                ) : null}
                {data ? <ForecastBody data={data} /> : null}
            </View>
        </Screen>
    )
}

function ForecastBody({ data }: { data: RainfallForecast }) {
    const { summary, hours, warning_hours: warningHours } = data
    const today = new Date()
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    return (
        <>
            <Text variant="caption" color="textMuted" style={styles.dates}>
                Today, {shortDate(today)} · Tomorrow, {shortDate(tomorrow)}
            </Text>

            <View style={styles.facts}>
                <Card style={styles.headline}>
                    <Text variant="subtitle" style={styles.center}>
                        {headline(summary)}
                    </Text>
                </Card>
                <Fact label="Rainfall Peak Strength" value={summary.peak ? `${summary.peak.mm_hr} mm/hr` : '—'} sub={summary.peak ? whenLabel(summary.peak) : undefined} />
                <Fact label="Total Estimated Rainfall" value={`${summary.total_mm} mm`} />
            </View>

            <Legend />

            <Card style={styles.list}>
                <ForecastChart hours={hours} warningHours={warningHours} />
            </Card>
        </>
    )
}

const Fact = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <Card style={styles.fact}>
        <Text variant="caption" color="textMuted" style={styles.factLabel}>
            {label}
        </Text>
        <Text variant="subtitle" style={styles.factValue}>
            {value}
        </Text>
        {sub ? (
            <Text variant="caption" color="textMuted" style={styles.factLabel}>
                {sub}
            </Text>
        ) : null}
    </Card>
)

const Legend = () => {
    const theme = useTheme()
    const items = [
        ['none', theme.colors.primary],
        ['yellow', BAND_COLORS.yellow],
        ['orange', BAND_COLORS.orange],
        ['red', BAND_COLORS.red],
    ] as const
    return (
        <View style={styles.legend}>
            {items.map(([band, color]) => (
                <View key={band} style={styles.legendItem}>
                    <View style={[styles.swatch, { backgroundColor: color }]} />
                    <Text variant="caption" color="textMuted">
                        {BAND_LABELS[band]}
                    </Text>
                </View>
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    stack: { gap: spacing.lg },
    dates: { textAlign: 'center' },
    headline: { flex: 2, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
    center: { textAlign: 'center' },
    facts: { flexDirection: 'row', gap: spacing.sm },
    factLabel: { fontSize: 11, lineHeight: 14 },
    factValue: { fontSize: 15, lineHeight: 20 },
    fact: { flex: 1, gap: 2, padding: spacing.sm, justifyContent: 'flex-start' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    swatch: { width: 10, height: 10, borderRadius: 5 },
    list: { gap: spacing.xs },
})
