import { useEffect, useRef, useState } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import type { NativeSyntheticEvent } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
    Camera,
    GeoJSONSource,
    Layer,
    Map,
    type CameraRef,
    type LngLat,
    type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native'

import { spacing, useTheme } from '@/common/theme'
import { Button, Icon, Spinner, Text } from '@/common/ui'
import { MAP_CENTER, MAP_PADDING, MAP_ZOOM, mapStyleFor } from '@/features/gis/constants/mapStyle'
import { collectionBounds } from '@/features/gis/utils/bounds'
import { featureAt } from '@/features/gis/utils/geo'
import type { PublicBarangayCollection } from '@/features/gis/types'

import { getPublicBarangays } from '../api/registrationApi'

interface Props {
    visible: boolean
    onClose: () => void
    /** Confirm the barangay under the pin (its operational name). */
    onConfirm: (barangay: string) => void
}

/** Resolve the barangay under a map centre coordinate. */
const detectAt = (center: LngLat, barangays: PublicBarangayCollection | null): string | null =>
    featureAt({ lng: center[0], lat: center[1] }, barangays)?.properties.name ?? null

/**
 * Drop-a-pin address picker. The map centre is the pin: whatever barangay sits
 * under the crosshair is resolved live (point-in-polygon against the public
 * boundaries) and shown for the resident to confirm. Same output as the GPS
 * path — a barangay name — so registration is agnostic to how it was chosen.
 */
export function PinMapModal({ visible, onClose, onConfirm }: Props) {
    const { colors, scheme } = useTheme()
    const cameraRef = useRef<CameraRef>(null)
    const [barangays, setBarangays] = useState<PublicBarangayCollection | null>(null)
    const [detected, setDetected] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Download boundaries once the sheet opens (pre-auth, so raw axios).
    useEffect(() => {
        if (!visible || barangays) return
        let active = true
        getPublicBarangays()
            .then((data) => active && setBarangays(data))
            .catch(() => active && setError('Couldn’t load the map. Check your connection.'))
        return () => {
            active = false
        }
    }, [visible, barangays])

    const fitToCity = () => {
        const box = barangays && collectionBounds(barangays)
        if (box) cameraRef.current?.fitBounds(box, { padding: MAP_PADDING })
    }

    const onRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
        setDetected(detectAt(event.nativeEvent.center, barangays))
    }

    const confirm = () => {
        if (detected) onConfirm(detected)
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.flex}>
                <Map
                    style={styles.flex}
                    mapStyle={mapStyleFor(scheme)}
                    onDidFinishLoadingMap={fitToCity}
                    onRegionDidChange={onRegionDidChange}
                >
                    <Camera ref={cameraRef} initialViewState={{ center: MAP_CENTER, zoom: MAP_ZOOM }} />
                    {barangays ? (
                        <GeoJSONSource id="pin-barangays" data={barangays}>
                            <Layer
                                id="pin-barangay-line"
                                type="line"
                                paint={{ 'line-color': '#7f1d1d', 'line-width': 1, 'line-opacity': 0.4 }}
                            />
                            <Layer
                                id="pin-barangay-active"
                                type="fill"
                                filter={['==', ['get', 'name'], detected ?? '']}
                                paint={{ 'fill-color': colors.primary, 'fill-opacity': 0.25 }}
                            />
                        </GeoJSONSource>
                    ) : null}
                </Map>

                {/* The fixed crosshair — its tip marks the map centre. */}
                <View pointerEvents="none" style={styles.crosshair}>
                    <Icon name="location-sharp" size={36} color={colors.primary} />
                </View>

                {!barangays && !error ? (
                    <View style={styles.loading}>
                        <Spinner />
                    </View>
                ) : null}

                <SafeAreaView edges={['bottom']} style={styles.sheetWrap}>
                    <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text variant="label" color="textMuted">
                            Move the map to your permanent address
                        </Text>
                        <Text variant="subtitle">
                            {error ?? (detected ? `Barangay ${detected}` : 'Pin is outside any barangay')}
                        </Text>
                        <View style={styles.actions}>
                            <Button label="Cancel" variant="ghost" onPress={onClose} style={styles.action} />
                            <Button
                                label="Use this location"
                                onPress={confirm}
                                disabled={!detected}
                                style={styles.action}
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    crosshair: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        // Lift the glyph so the pin's tip, not its centre, sits on the map centre.
        marginBottom: 28,
    },
    loading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    sheet: {
        margin: spacing.md,
        padding: spacing.lg,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        gap: spacing.sm,
    },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    action: { flex: 1 },
})
