import { Linking, StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Card, Text } from '@/common/ui'
import type { NearestCenter } from '@/features/gis/utils/geo'

interface Props {
    nearest: NearestCenter | null
    /** Shown when there's no location fix or no centers loaded. */
    emptyMessage: string
}

const formatDistance = (km: number): string =>
    km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`

/** The nearest evacuation center to the resident's current position. */
export function EvacuationCard({ nearest, emptyMessage }: Props) {
    if (!nearest) {
        return (
            <Card style={styles.card}>
                <Text variant="label" color="textMuted">
                    Nearest evacuation center
                </Text>
                <Text variant="body" color="textMuted">
                    {emptyMessage}
                </Text>
            </Card>
        )
    }

    const { center, distanceKm } = nearest
    const { name, barangay_name, capacity, contact } = center.properties

    return (
        <Card style={styles.card}>
            <Text variant="label" color="textMuted">
                Nearest evacuation center
            </Text>
            <Text variant="subtitle">{name}</Text>

            <View style={styles.meta}>
                <Text variant="caption" color="textMuted">
                    {formatDistance(distanceKm)}
                </Text>
                {barangay_name ? (
                    <Text variant="caption" color="textMuted">
                        · {barangay_name}
                    </Text>
                ) : null}
                {capacity != null ? (
                    <Text variant="caption" color="textMuted">
                        · Capacity {capacity}
                    </Text>
                ) : null}
            </View>

            {contact ? (
                <Button
                    label={`Call ${contact}`}
                    variant="secondary"
                    onPress={() => Linking.openURL(`tel:${contact}`)}
                />
            ) : null}
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { gap: spacing.sm },
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
})
