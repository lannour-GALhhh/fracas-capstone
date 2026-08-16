import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { useCurrentLocation } from '@/common/hooks/useCurrentLocation'
import { spacing } from '@/common/theme'
import { Button, Card, Field, Text } from '@/common/ui'
import { featureAt } from '@/features/gis/utils/geo'

import { getPublicBarangays } from '../api/registrationApi'
import { LocationConfirmModal } from './LocationConfirmModal'
import { PinMapModal } from './PinMapModal'
import type { RegistrationAddress } from '../types'

interface Props {
    value: RegistrationAddress
    onChange: (address: RegistrationAddress) => void
    disabled?: boolean
}

type Mode = 'idle' | 'choosing'

/**
 * "Set permanent address" for registration phase 1. Offers two methods: the
 * location-service path resolves the barangay by point-in-polygon against the
 * public boundaries; the map-pin path lets the resident place it by hand. The
 * detected barangay is shown for the resident to confirm, plus an optional
 * unit/house field — and can be cleared to return to the two method buttons.
 */
export function AddressPicker({ value, onChange, disabled }: Props) {
    const { request } = useCurrentLocation()
    const [mode, setMode] = useState<Mode>('idle')
    const [busy, setBusy] = useState(false)
    const [pinOpen, setPinOpen] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const detected = value.barangay?.trim() || null

    const applyBarangay = (barangay: string) => {
        onChange({ ...value, barangay })
        setMode('idle')
        setPinOpen(false)
    }

    /** Drop the detected barangay and go back to the two method buttons. */
    const resetBarangay = () => {
        onChange({ ...value, barangay: undefined })
        setError(null)
        setMode('choosing')
    }

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
            applyBarangay(match.properties.name)
        } catch {
            setError('Couldn’t load barangays. Check your connection and try again.')
        } finally {
            setBusy(false)
        }
    }

    const confirmLocation = () => {
        setConfirmOpen(false)
        void resolveByLocation()
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
                        onPress={resetBarangay}
                        disabled={disabled || busy}
                    />
                </>
            ) : mode === 'choosing' ? (
                <View style={styles.choices}>
                    <Text variant="body" color="textMuted">
                        How do you want to set your barangay?
                    </Text>
                    <View style={styles.methods}>
                        <Button
                            label="Use my location"
                            onPress={() => setConfirmOpen(true)}
                            loading={busy}
                            disabled={disabled}
                            style={styles.method}
                        />
                        <Button
                            label="Drop a pin"
                            onPress={() => setPinOpen(true)}
                            disabled={disabled || busy}
                            style={styles.method}
                        />
                    </View>
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

            <LocationConfirmModal
                visible={confirmOpen}
                onCancel={() => setConfirmOpen(false)}
                onConfirm={confirmLocation}
            />

            <PinMapModal
                visible={pinOpen}
                onClose={() => setPinOpen(false)}
                onConfirm={applyBarangay}
            />
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { gap: spacing.sm },
    choices: { gap: spacing.sm },
    methods: { flexDirection: 'row', gap: spacing.sm },
    method: { flex: 1 },
})
