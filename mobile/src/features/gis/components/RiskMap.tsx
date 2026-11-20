import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import type { Feature, LineString } from 'geojson'
import type { LayoutChangeEvent, NativeSyntheticEvent } from 'react-native'
import {
    Camera,
    GeoJSONSource,
    Layer,
    Map,
    Marker,
    UserLocation,
    type CameraRef,
    type MapRef,
    type ViewStateChangeEvent,
    type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native'

import { useTheme } from '@/common/theme'
import { Icon, Text } from '@/common/ui'

import { MAP_CENTER, MAP_PADDING, MAP_ZOOM, mapStyleFor } from '../constants/mapStyle'
import { fillColorExpression } from '../constants/risk'
import { collectionBounds } from '../utils/bounds'
import { type Bounds, type Size, placeGuide } from '../utils/guide'
import { NearestCenterGuide } from './NearestCenterGuide'
import type { Coords } from '@/common/hooks/useCurrentLocation'
import type { EvacuationCenterCollection, RiskFeatureCollection } from '../types'
import { centerRadiusCollection, radiusCollection } from '@/features/evacuation/radius/geometry'
import type { RadiusEvacuation } from '@/features/evacuation/radius/types'

interface Props {
    /** Risk-joined barangay boundaries; null until the first load resolves. */
    data: RiskFeatureCollection | null
    /** Evacuation centers plotted as tent pins (optional/empty is fine). */
    centers: EvacuationCenterCollection | undefined
    /** Barangay id to outline as selected (mirrors the detail modal). */
    selectedId: number | null
    /** Tap a barangay → its id, or null when tapping empty map. */
    onSelect: (id: number | null) => void
    /** Show the blue GPS dot (only once location permission is granted). */
    showUser: boolean
    /** The resident's fixed location, for the "You are here" pin. Only drawn
     * alongside the live GPS dot when `showUser` is also true. */
    userCoords?: Coords | null
    /** Allow pan/zoom gestures. Off for a fixed overview, on for an explorable map. */
    interactive?: boolean
    /** Fill the parent instead of the fixed preview height. */
    fill?: boolean
    /**
     * Recenter the camera on this point. A fresh object flies the map there — used
     * to focus the resident's location or a card's barangay. Null keeps the default
     * city framing. Overrides the initial fit-to-city when set on mount.
     */
    focus?: MapFocus | null
    /** Active point + radius evacuations, drawn as red circles. */
    radiusEvacuations?: RadiusEvacuation[]
    /** Nearest evacuation center to guide the resident to; null hides the guide. */
    guideTarget?: GuideTarget | null
}

export interface GuideTarget {
    lng: number
    lat: number
    distanceKm: number
}

/** A camera target: where to center and how far to zoom in. */
export interface MapFocus {
    center: [number, number]
    zoom?: number
}

/** Neighborhood-level zoom used when focusing a single location. */
const FOCUS_ZOOM = 14

/** No barangay matches this id, so the "selected" outline hides when unset. */
const NO_SELECTION = -1
const REFUGE_COLOR = '#059669' // emerald — matches the web evacuation pin

/**
 * The flood choropleth. Barangays are filled by their joined risk category
 * (one ramp shared with the cards), evacuation centers ride on top as refuge
 * dots, and the device location shows as the standard GPS puck plus a
 * labelled "You are here" pin. Tapping a barangay selects it — the parent
 * opens the same breakdown modal the cards do. MapLibre needs a custom dev
 * client; this screen cannot run in Expo Go.
 */
export function RiskMap({
    data,
    centers,
    selectedId,
    onSelect,
    showUser,
    userCoords = null,
    interactive = true,
    fill = false,
    focus = null,
    radiusEvacuations = [],
    guideTarget = null,
}: Props) {
    const theme = useTheme()
    const { scheme } = theme
    const cameraRef = useRef<CameraRef>(null)
    const mapRef = useRef<MapRef>(null)
    const [bounds, setBounds] = useState<Bounds | null>(null)
    const [size, setSize] = useState<Size | null>(null)
    const [loaded, setLoaded] = useState(false)
    const fittedRef = useRef(false)
    const centerCircles = useMemo(() => centerRadiusCollection(centers), [centers])

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

    // Default framing: fit the whole city — but only when no explicit focus is
    // requested (the expanded map opens focused on the resident's location).
    useEffect(() => {
        if (loaded && !focus) fitToData()
    }, [loaded, focus, fitToData])

    // Fly to a requested point whenever it changes (card "center map here"
    // buttons pass a fresh object each tap, so repeat taps re-focus).
    useEffect(() => {
        if (!loaded || !focus) return
        cameraRef.current?.flyTo({ center: focus.center, zoom: focus.zoom ?? FOCUS_ZOOM, duration: 600 })
    }, [loaded, focus])

    const trackBounds = useCallback((e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
        setBounds(e.nativeEvent.bounds as Bounds)
    }, [])

    const handleLoaded = () => {
        setLoaded(true)
        void mapRef.current?.getBounds().then((b) => setBounds(b as Bounds))
    }

    const onLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout
        setSize({ width, height })
    }

    // Usable area for the guide arrow: clear of the top controls/banners, the
    // collapsed bottom sheet and the right-hand button column.
    const placement = useMemo(() => {
        if (!guideTarget || !bounds || !size) return null
        const rect = { left: 16, top: 130, right: size.width - 72, bottom: size.height * 0.8 - 16 }
        if (rect.right <= rect.left || rect.bottom <= rect.top) return null
        return placeGuide(bounds, size, showUser ? userCoords : null, guideTarget, rect)
    }, [guideTarget, bounds, size, showUser, userCoords])

    const guideLine = useMemo(
        () =>
            guideTarget && showUser && userCoords
                ? ({
                      type: 'Feature' as const,
                      properties: {},
                      geometry: {
                          type: 'LineString' as const,
                          coordinates: [
                              [userCoords.lng, userCoords.lat],
                              [guideTarget.lng, guideTarget.lat],
                          ],
                      },
                  } satisfies Feature<LineString>)
                : null,
        [guideTarget, showUser, userCoords],
    )

    const handlePress = (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
        const id = event.nativeEvent.features?.[0]?.properties?.id
        onSelect(typeof id === 'number' ? id : null)
    }

    return (
        <View style={[styles.container, fill ? styles.fill : styles.preview]} onLayout={onLayout}>
            <Map
                ref={mapRef}
                style={styles.map}
                onRegionIsChanging={trackBounds}
                onRegionDidChange={trackBounds}
                mapStyle={mapStyleFor(scheme)}
                onDidFinishLoadingMap={handleLoaded}
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

                {radiusEvacuations.length > 0 ? (
                    <GeoJSONSource id="radius-evacuations" data={radiusCollection(radiusEvacuations)}>
                        <Layer id="radius-fill" type="fill" paint={{ 'fill-color': '#dc2626', 'fill-opacity': 0.25 }} />
                        <Layer id="radius-line" type="line" paint={{ 'line-color': '#dc2626', 'line-width': 2.5 }} />
                    </GeoJSONSource>
                ) : null}

                {centerCircles.features.length > 0 ? (
                    <GeoJSONSource id="center-radius" data={centerCircles}>
                        <Layer id="center-radius-fill" type="fill" paint={{ 'fill-color': REFUGE_COLOR, 'fill-opacity': 0.15 }} />
                        <Layer id="center-radius-line" type="line" paint={{ 'line-color': REFUGE_COLOR, 'line-width': 2, 'line-dasharray': [2, 2] }} />
                    </GeoJSONSource>
                ) : null}

                {guideLine && placement?.inView ? (
                    <GeoJSONSource id="guide-line" data={guideLine}>
                        <Layer
                            id="guide-line-dash"
                            type="line"
                            layout={{ 'line-cap': 'butt' }}
                            paint={{ 'line-color': REFUGE_COLOR, 'line-width': 3, 'line-dasharray': [2, 2] }}
                        />
                    </GeoJSONSource>
                ) : null}

                {centers?.features.map((f) => (
                    <Marker key={f.properties.id} lngLat={f.geometry.coordinates as [number, number]} anchor="center">
                        <View style={styles.evacPin}>
                            <View style={styles.tentRoof} />
                            <View style={styles.tentDoor} />
                        </View>
                    </Marker>
                ))}

                {showUser ? <UserLocation animated /> : null}

                {showUser && userCoords ? (
                    <Marker lngLat={[userCoords.lng, userCoords.lat]} anchor="bottom">
                        <View style={styles.userPin}>
                            <View style={[styles.userPinLabel, { backgroundColor: theme.colors.text }]}>
                                <Text style={[styles.userPinLabelText, { color: theme.colors.bg }]}>
                                    You are here
                                </Text>
                            </View>
                            <Icon name="location" size={30} color={theme.colors.primary} />
                        </View>
                    </Marker>
                ) : null}
            </Map>

            {guideTarget && placement ? (
                <NearestCenterGuide placement={placement} distanceKm={guideTarget.distanceKm} />
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { borderRadius: 16, overflow: 'hidden' },
    preview: { height: 280 },
    fill: { flex: 1, borderRadius: 0 },
    map: { flex: 1 },
    userPin: { alignItems: 'center' },
    // Web parity: emerald disc, white border, white tent glyph.
    evacPin: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: REFUGE_COLOR,
        borderWidth: 2,
        borderColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
    tentRoof: {
        width: 0,
        height: 0,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderBottomWidth: 11,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#ffffff',
    },
    tentDoor: {
        position: 'absolute',
        bottom: 6,
        width: 0,
        height: 0,
        borderLeftWidth: 2.5,
        borderRightWidth: 2.5,
        borderBottomWidth: 5,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: REFUGE_COLOR,
    },
    userPinLabel: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        marginBottom: 2,
    },
    userPinLabelText: { fontSize: 11, fontWeight: '700' },
})
