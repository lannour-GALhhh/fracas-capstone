import { StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, type IconName, Text } from '@/common/ui'
import { CATEGORY_LABELS, RISK_COLORS } from '@/features/gis/constants/risk'
import { SUSCEPTIBILITY_LABELS } from '@/features/gis/constants/susceptibility'
import type { LocalizedRisk, RiskCategory, RiskFeature } from '@/features/gis/types'

interface Props {
    /** The resident's current-location barangay (falls back to a prompt when null). */
    feature: RiskFeature | null
    /** Pinpoint risk at the resident's exact coordinates — preferred over the
     * barangay average when the point falls inside a mapped susceptibility zone. */
    localized?: LocalizedRisk | null
    /** Short line explaining why there's no reading (locating, denied, outside). */
    emptyMessage: string
}

const COPY: Record<RiskCategory, { icon: IconName; message: string }> = {
    low: { icon: 'checkmark-circle', message: 'Conditions are calm. Stay aware of updates.' },
    medium: { icon: 'alert-circle', message: 'Be alert and keep monitoring conditions.' },
    high: { icon: 'warning', message: 'Prepare to act — ready your go-bag now.' },
    critical: { icon: 'warning', message: 'Danger. Follow evacuation advice immediately.' },
}

/**
 * The status page's headline: a color-coded banner summarising the resident's
 * current flood risk at a glance, so the most important number isn't buried in a
 * list of plain cards.
 */
export function StatusHero({ feature, localized, emptyMessage }: Props) {
    const theme = useTheme()

    // Prefer the pinpoint zone reading; fall back to the barangay-average category.
    const zone = localized?.localized ?? null
    const category: RiskCategory | null = zone?.category ?? feature?.properties.category ?? null

    if (!feature || !category) {
        return (
            <View
                style={[
                    styles.card,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
            >
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Icon name="location-outline" size={26} color={theme.colors.textMuted} />
                </View>
                <View style={styles.text}>
                    <Text variant="label" color="textMuted">
                        Current location
                    </Text>
                    <Text variant="subtitle">Checking your area…</Text>
                    <Text variant="caption" color="textMuted">
                        {emptyMessage}
                    </Text>
                </View>
            </View>
        )
    }

    const { name } = feature.properties
    const accent = RISK_COLORS[category]
    const copy = COPY[category]

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: accent }]}>
            <View style={[styles.iconWrap, { backgroundColor: accent }]}>
                <Icon name={copy.icon} size={26} color="#ffffff" />
            </View>
            <View style={styles.scoreColumn}>
                <Text variant="label" color="textMuted">
                    {`You're in ${name}`}
                </Text>
                <View style={styles.scoreColumn}>
                    <View style={styles.scoreRow}>
                        <Text style={styles.category}>{CATEGORY_LABELS[category]}</Text>
                        {zone ? (
                            <Text variant="caption" style={{ fontWeight: 'bold' }}>
                                {Math.round(zone.score)} · your exact spot
                            </Text>
                        ) : (
                            <Text variant="caption" style={{ fontWeight: 'bold' }}>
                                Level Hazard Risk
                            </Text>
                        )}
                    </View>
                    {zone ? (
                        <Text variant="caption" color="textMuted">
                            {`${SUSCEPTIBILITY_LABELS[zone.level]} susceptibility zone`}
                        </Text>
                    ) : null}
                </View>
                <Text variant="caption" color="textMuted">
                    {copy.message}
                </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderWidth: 2,
        borderRadius: radius.lg,
        overflow: 'hidden',
    },
    accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: { flex: 1, gap: 2 },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    scoreColumn: { flexDirection: 'column', alignItems: 'baseline', gap: spacing.xs },
    category: { fontSize: 22, fontWeight: '700' },
})
