import { StyleSheet } from 'react-native'

import type { Coords } from '@/common/hooks/useCurrentLocation'
import { RISK_COLORS, spacing, useTheme } from '@/common/theme'
import { Card, Text } from '@/common/ui'

import { distanceToCenterM, isInside } from './geometry'
import type { RadiusEvacuation } from './types'

interface Props {
    evacuation: RadiusEvacuation
    coords: Coords | null
}

const metres = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`)

/** Inside the radius: evacuate. Evacuated afterwards: safe. Elsewhere: nothing to show. */
export function RadiusEvacuationBanner({ evacuation, coords }: Props) {
    const theme = useTheme()
    const label = evacuation.name || 'Marked area'
    const inside = coords ? isInside(coords, evacuation) : false

    if (evacuation.my_status === 'safe' && !inside) {
        return (
            <Card style={{ ...styles.card, backgroundColor: theme.colors.success, borderColor: theme.colors.success }}>
                <Text variant="label" style={styles.white}>{"You've left the evacuation area ✓"}</Text>
                <Text variant="body" style={styles.white}>
                    {`${label} is still under evacuation. Stay out of the ${metres(evacuation.radius_m)} radius until advisories say it's clear.`}
                </Text>
            </Card>
        )
    }

    if (!inside) return null

    const toEdge = coords ? Math.max(evacuation.radius_m - distanceToCenterM(coords, evacuation), 0) : null
    return (
        <Card style={{ ...styles.card, backgroundColor: RISK_COLORS.critical, borderColor: RISK_COLORS.critical }}>
            <Text variant="label" style={styles.white}>⚠ Evacuate now</Text>
            <Text variant="subtitle" style={styles.white}>{label}</Text>
            <Text variant="body" style={styles.white}>
                {`You are inside the ${metres(evacuation.radius_m)} evacuation radius. Move out of the red area and head to the nearest evacuation center.`}
            </Text>
            {toEdge != null ? (
                <Text variant="caption" style={styles.whiteMuted}>{`About ${metres(toEdge)} to the edge of the radius`}</Text>
            ) : null}
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { gap: spacing.sm },
    white: { color: '#ffffff' },
    whiteMuted: { color: 'rgba(255,255,255,0.85)' },
})
