import { Pressable, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, Text } from '@/common/ui'
import { timeAgo } from '@/common/utils/time'
import { CATEGORY_LABELS, RISK_COLORS } from '@/features/gis/constants/risk'
import type { LocalizedRisk, RiskCategory, RiskFeature } from '@/features/gis/types'

import type { NearestCenter } from '@/features/gis/utils/geo'

interface Props {
    /** The resident's current-location barangay (falls back to a prompt when null). */
    feature: RiskFeature | null
    /** Pinpoint risk at the resident's exact coordinates, preferred over the
     * barangay average when it falls inside a mapped susceptibility zone. */
    localized?: LocalizedRisk | null
    /** Short line explaining why there's no reading (locating, denied, outside). */
    emptyMessage: string
    /** When the whole map's risk was last computed. */
    computedAt: string | null
    nearest: NearestCenter | null
    /** Fully expands the sheet (tapping the row is a shortcut for dragging it up). */
    onExpand: () => void
}

const formatDistance = (km: number): string =>
    km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`

/**
 * The always-visible top row of the flood-status sheet: enough to glance at
 * (current risk + nearest evac) while the sheet sits collapsed over the map.
 * Sits at the top of the sheet's scroll content, so it's what's left showing
 * when the sheet is dragged down, and it scrolls away with the rest once
 * the sheet is dragged open.
 */
export function StatusSummaryRow({ feature, localized, emptyMessage, computedAt, nearest, onExpand }: Props) {
    const theme = useTheme()

    const zone = localized?.localized ?? null
    const category: RiskCategory | null = zone?.category ?? feature?.properties.category ?? null
    const accent = category ? RISK_COLORS[category] : theme.colors.surfaceAlt

    return (
        <Pressable
            onPress={onExpand}
            accessibilityRole="button"
            accessibilityLabel="Drag up or tap for full flood status details"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
            <View style={[styles.iconWrap, { backgroundColor: accent }]}>
                <Icon
                    name={category ? 'warning' : 'location-outline'}
                    size={20}
                    color={category ? '#ffffff' : theme.colors.textMuted}
                />
            </View>

            <View style={styles.textCol}>
                {feature && category ? (
                    <>
                        <Text variant="subtitle" numberOfLines={1}>
                            {`${CATEGORY_LABELS[category]} · ${feature.properties.name}`}
                        </Text>
                        <Text variant="caption" color="textMuted" numberOfLines={1}>
                            {nearest
                                ? `Nearest evac ${formatDistance(nearest.distanceKm)}`
                                : computedAt
                                  ? `Updated ${timeAgo(computedAt)}`
                                  : ' '}
                        </Text>
                    </>
                ) : (
                    <>
                        <Text variant="subtitle" numberOfLines={1}>
                            Flood status
                        </Text>
                        <Text variant="caption" color="textMuted" numberOfLines={1}>
                            {emptyMessage}
                        </Text>
                    </>
                )}
            </View>

            <Icon name="chevron-up" size={20} color={theme.colors.textMuted} />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    pressed: { opacity: 0.7 },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textCol: { flex: 1, gap: 2 },
})
