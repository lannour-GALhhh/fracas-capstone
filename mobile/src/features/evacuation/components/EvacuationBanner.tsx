import { StyleSheet } from 'react-native'

import { RISK_COLORS, spacing, useTheme } from '@/common/theme'
import { Button, Card, Text } from '@/common/ui'
import type { NearestCenter } from '@/features/gis/utils/geo'

import type { MyEvacuation } from '../types'

interface Props {
    evacuation: MyEvacuation
    nearest: NearestCenter | null
    onMarkSafe: () => void
    isReporting: boolean
    locationEnabled: boolean
}

const formatDistance = (km: number): string =>
    km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`

/**
 * The top-of-screen evacuation call-to-action. Red "evacuate now" while the
 * resident is still in the zone; a green "you're marked safe" confirmation once
 * their device has reported safe.
 */
export function EvacuationBanner({
    evacuation,
    nearest,
    onMarkSafe,
    isReporting,
    locationEnabled,
}: Props) {
    const theme = useTheme()

    if (evacuation.my_status === 'safe') {
        return (
            <Card style={{ ...styles.card, backgroundColor: theme.colors.success, borderColor: theme.colors.success }}>
                <Text variant="label" style={styles.white}>
                    {"You're marked safe ✓"}
                </Text>
                <Text variant="body" style={styles.white}>
                    {`${evacuation.barangay_name} is under evacuation. Stay at the center or a safe area until advisories say it's clear to return.`}
                </Text>
            </Card>
        )
    }

    const context =
        evacuation.trigger === 'operator'
            ? 'declared by disaster response'
            : 'triggered by critical flood risk'

    return (
        <Card style={{ ...styles.card, backgroundColor: RISK_COLORS.critical, borderColor: RISK_COLORS.critical }}>
            <Text variant="label" style={styles.white}>
                ⚠ Evacuate now
            </Text>
            <Text variant="subtitle" style={styles.white}>
                {evacuation.barangay_name}
            </Text>
            <Text variant="body" style={styles.white}>
                An evacuation has been {context}. Proceed to the nearest evacuation center and mark
                yourself safe when you arrive.
            </Text>
            {nearest ? (
                <Text variant="caption" style={styles.whiteMuted}>
                    Nearest: {nearest.center.properties.name} · {formatDistance(nearest.distanceKm)}
                </Text>
            ) : !locationEnabled ? (
                <Text variant="caption" style={styles.whiteMuted}>
                    Enable location to see your nearest center.
                </Text>
            ) : null}
            <Button
                label="I've reached safety"
                variant="secondary"
                onPress={onMarkSafe}
                loading={isReporting}
                style={styles.action}
            />
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { gap: spacing.sm },
    white: { color: '#ffffff' },
    whiteMuted: { color: 'rgba(255,255,255,0.85)' },
    action: { marginTop: spacing.sm },
})
