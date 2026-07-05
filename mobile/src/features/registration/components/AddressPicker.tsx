import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { useCurrentLocation } from '@/common/hooks/useCurrentLocation'
import { spacing } from '@/common/theme'
import { Button, Card, Field, Text } from '@/common/ui'
import { featureAt } from '@/features/gis/utils/geo'

import { getPublicBarangays } from '../api/registrationApi'
import type { RegistrationAddress } from '../types'

interface Props {
    value: RegistrationAddress
    onChange: (address: RegistrationAddress) => void
    disabled?: boolean
}

type Mode = 'idle' | 'choosing'

/**
 * "Set permanent address" for registration phase 1. Offers two methods: the
 * location-service path (available now) resolves the barangay by point-in-polygon
 * against the public boundaries; the map-pin path lands in Phase C2. The detected
 * barangay is shown for the resident to confirm, plus an optional unit/house field.
 */
export function AddressPicker({ value, onChange, disabled }: Props) {
    const { request } = useCurrentLocation()
    const [mode, setMode] = useState<Mode>('idle')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const detected = value.barangay?.trim() || null

    const resolveByLocation = async () => {
        setBusy(true)
        setError(null)
        try {
            const coords = await request()
            if (!coords) {
                setError('We couldn’t access your location. Turn location on and try again.')
                return
            }
            const barangays = await getPublicBarangays()
            const match = featureAt(coords, barangays)
            if (!match) {
                setError('Your location isn’t inside a known barangay. You can set this later in your profile.')
                return
            }
            onChange({ ...value, barangay: match.properties.name })
            setMode('idle')
        } catch {
            setError('Couldn’t load barangays. Check your connection and try again.')
        } finally {
            setBusy(false)
        }
    }

    const confirmLocation = () => {
        Alert.alert(
            'Set your permanent address',
            'Please stand at your permanent address before continuing, then tap “I’m here”.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'I’m here', onPress: () => void resolveByLocation() },
            ],
        )
    }

    return (
        <Card style={styles.card}>
            <Text variant="label" color="textMuted">
                Permanent address
            </Text>

            {detected ? (
                <>
                    <Text variant="subtitle">Barangay {detected}</Text>
                    <Field
                        label="House / unit no. (optional)"
                        placeholder="e.g. 12-B Rizal St."
                        value={value.unit ?? ''}
                        onChangeText={(unit) => onChange({ ...value, unit })}
                    />
                    <Button
                        label="Change barangay"
                        variant="ghost"
                        onPress={() => setMode('choosing')}
                        disabled={disabled || busy}
                    />
                </>
            ) : mode === 'choosing' ? (
                <View style={styles.choices}>
                    <Text variant="body" color="textMuted">
                        How do you want to set your barangay?
                    </Text>
                    <Button
                        label="Use my location"
                        variant="secondary"
                        onPress={confirmLocation}
                        loading={busy}
                        disabled={disabled}
                    />
                    <Button label="Drop a pin (soon)" variant="ghost" onPress={() => {}} disabled />
                </View>
            ) : (
                <Button
                    label="Set permanent address"
                    variant="secondary"
                    onPress={() => setMode('choosing')}
                    disabled={disabled}
                />
            )}

            {error ? (
                <Text variant="caption" color="danger">
                    {error}
                </Text>
            ) : null}
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { gap: spacing.sm },
    choices: { gap: spacing.sm },
})
