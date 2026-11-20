import { Pressable, StyleSheet } from 'react-native'

import { spacing } from '@/common/theme'
import { Text } from '@/common/ui'
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, RISK_TEXT_COLORS } from '@/features/gis/constants/risk'
import type { LocalizedRisk, RiskCategory, RiskFeature } from '@/features/gis/types'

interface Props {
    /** The barangay being shown (current location or home); null shows a prompt. */
    feature: RiskFeature | null
    /** Pinpoint risk at the resident's exact coordinates, preferred over the
     * barangay average when it falls inside a mapped susceptibility zone. */
    localized?: LocalizedRisk | null
    /** Short line explaining why there's no reading (locating, denied, outside). */
    emptyMessage: string
    /** Fully expands the sheet (tapping the row is a shortcut for dragging it up). */
    onExpand: () => void
}

/**
 * The always-visible top of the flood-status sheet, mirroring the web barangay
 * panel: barangay name, then the centered ALL-CAPS risk level in its web color,
 * then what to do. This is what's left showing while the sheet is collapsed.
 */
export function StatusSummaryRow({ feature, localized, emptyMessage, onExpand }: Props) {
    const zone = localized?.localized ?? null
    const category: RiskCategory | null = zone?.category ?? feature?.properties.category ?? null

    return (
        <Pressable
            onPress={onExpand}
            accessibilityRole="button"
            accessibilityLabel="Drag up or tap for full flood status details"
            style={({ pressed }) => [styles.col, pressed && styles.pressed]}
        >
            {feature ? (
                <>
                    <Text variant="subtitle" numberOfLines={1} style={styles.center}>
                        {feature.properties.name}
                    </Text>
                    <Text style={[styles.category, { color: category ? RISK_TEXT_COLORS[category] : undefined }]}>
                        {category ? CATEGORY_LABELS[category] : 'No data'}
                    </Text>
                    <Text variant="caption" color="textMuted" style={styles.center}>
                        {category
                            ? CATEGORY_DESCRIPTIONS[category]
                            : 'Risk level unavailable — no recent score for this barangay.'}
                    </Text>
                </>
            ) : (
                <>
                    <Text variant="subtitle" style={styles.center}>
                        Flood status
                    </Text>
                    <Text variant="caption" color="textMuted" style={styles.center}>
                        {emptyMessage}
                    </Text>
                </>
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    col: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
    pressed: { opacity: 0.7 },
    center: { textAlign: 'center' },
    category: {
        fontSize: 30,
        lineHeight: 36,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
})
