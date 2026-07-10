import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { NativeSyntheticEvent } from 'react-native'
import {
    Camera,
    GeoJSONSource,
    Layer,
    Map,
    UserLocation,
    type CameraRef,
    type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native'

import { useTheme } from '@/common/theme'
import { Icon } from '@/common/ui'

import { MAP_CENTER, MAP_PADDING, MAP_ZOOM, mapStyleFor } from '../constants/mapStyle'
import { fillColorExpression } from '../constants/risk'
import { collectionBounds } from '../utils/bounds'
import type { EvacuationCenterCollection, RiskFeatureCollection } from '../types'

interface Props {
    /** Risk-joined barangay boundaries; null until the first load resolves. */
    data: RiskFeatureCollection | null
    /** Evacuation centers plotted as refuge dots (optional/empty is fine). */
    centers: EvacuationCenterCollection | undefined
    /** Barangay id to outline as selected (mirrors the detail modal). */
    selectedId: number | null
    /** Tap a barangay → its id, or null when tapping empty map. */
    onSelect: (id: number | null) => void
    /** Show the blue GPS dot (only once location permission is granted). */
    showUser: boolean
    /** Allow pan/zoom gestures. Off on the status card (a fixed overview), on in the expanded view. */
    interactive?: boolean
    /** When set, renders an expand affordance that opens the draggable full map. */
    onExpand?: () => void
    /** Fill the parent instead of the fixed preview height (used by the expanded view). */
    fill?: boolean
}

/** No barangay matches this id, so the "selected" outline hides when unset. */
const NO_SELECTION = -1
const REFUGE_COLOR = '#0f766e' // teal — a "safe place" hue outside the red ramp

/**
 * The flood choropleth. Barangays are filled by their joined risk category
 * (one ramp shared with the cards), evacuation centers ride on top as refuge
 * dots, and the device location shows as the standard GPS puck. Tapping a
 * barangay selects it — the parent opens the same breakdown modal the cards do.
 * MapLibre needs a custom dev client; this screen cannot run in Expo Go.
 */
export function RiskMap({
    data,
    centers,
    selectedId,
    onSelect,
    showUser,
    interactive = true,
    onExpand,
    fill = false,
}: Props) {
    const { colors, scheme } = useTheme()
    const cameraRef = useRef<CameraRef>(null)
    const [loaded, setLoaded] = useState(false)
    const fittedRef = useRef(false)

    // Frame the whole city once, as soon as both the style and the boundaries
    // are ready (either can win the race: boundaries are persisted, the style
    // is fetched). Guarded so later data refreshes don't yank the camera back.
    const fitToData = useCallback(() => {
        if (fittedRef.current || !data) return
        const box = collectionBounds(data)
        if (!box) return
        cameraRef.current?.fitBounds(box, { padding: MAP_PADDING })
        fittedRef.current = true
    }, [data])

    useEffect(() => {
        if (loaded) fitToData()
    }, [loaded, fitToData])

    const handlePress = (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
        const id = event.nativeEvent.features?.[0]?.properties?.id
        onSelect(typeof id === 'number' ? id : null)
    }

    return (
        <View style={[styles.container, fill ? styles.fill : styles.preview]}>
            <Map
                style={styles.map}
                mapStyle={mapStyleFor(scheme)}
                onDidFinishLoadingMap={() => setLoaded(true)}
                dragPan={interactive}
                touchZoom={interactive}
                doubleTapZoom={interactive}
                doubleTapHoldZoom={interactive}
                touchRotate={interactive}
                touchPitch={interactive}
            >
                <Camera
                    ref={cameraRef}
                    initialViewState={{ center: MAP_CENTER, zoom: MAP_ZOOM }}
                />

                {data ? (
                    <GeoJSONSource id="barangays" data={data} onPress={handlePress}>
                        <Layer
                            id="barangay-fill"
                            type="fill"
                            paint={{ 'fill-color': fillColorExpression, 'fill-opacity': 0.7 }}
                        />
                        <Layer
                            id="barangay-line"
                            type="line"
                            paint={{ 'line-color': '#7f1d1d', 'line-width': 1, 'line-opacity': 0.4 }}
                        />
                        <Layer
                            id="barangay-selected"
                            type="line"
                            filter={['==', ['get', 'id'], selectedId ?? NO_SELECTION]}
                            paint={{
                                'line-color': scheme === 'dark' ? '#ffffff' : '#0a0a0a',
                                'line-width': 3,
                            }}
                        />
                    </GeoJSONSource>
                ) : null}

                {centers && centers.features.length > 0 ? (
                    <GeoJSONSource id="centers" data={centers}>
                        <Layer
                            id="center-dot"
                            type="circle"
                            paint={{
                                'circle-radius': 5,
                                'circle-color': REFUGE_COLOR,
                                'circle-stroke-width': 2,
                                'circle-stroke-color': '#ffffff',
                            }}
                        />
                    </GeoJSONSource>
                ) : null}

                {showUser ? <UserLocation animated /> : null}
            </Map>

            {onExpand ? (
                <Pressable
                    onPress={onExpand}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Expand map"
                    style={({ pressed }) => [
                        styles.expand,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                        pressed && styles.pressed,
                    ]}
                >
                    <Icon name="expand-outline" size={18} color={colors.text} />
                </Pressable>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { borderRadius: 16, overflow: 'hidden' },
    preview: { height: 280 },
    fill: { flex: 1, borderRadius: 0 },
    map: { flex: 1 },
    expand: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 38,
        height: 38,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: { opacity: 0.6 },
})
