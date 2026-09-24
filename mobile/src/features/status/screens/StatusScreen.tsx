import { useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'

import { ErrorState } from '@/common/components/ErrorState'
import { radius, spacing, useTheme } from '@/common/theme'
import { Button, Spinner, Text } from '@/common/ui'
import { useCurrentLocation } from '@/common/hooks/useCurrentLocation'
import { timeAgo } from '@/common/utils/time'
import { useAutoSubscribeHome } from '@/features/alerts/hooks/useAutoSubscribeHome'
import { EvacuationBanner } from '@/features/evacuation/components/EvacuationBanner'
import { useEvacuationReporter } from '@/features/evacuation/hooks/useEvacuationReporter'
import { useMyEvacuations } from '@/features/evacuation/hooks/useMyEvacuations'
import { type MapFocus, RiskMap } from '@/features/gis/components/RiskMap'
import { useEvacuationCenters } from '@/features/gis/hooks/useEvacuationCenters'
import { useLocalizedRisk } from '@/features/gis/hooks/useLocalizedRisk'
import { useRiskMap } from '@/features/gis/hooks/useRiskMap'
import { centroidOf, geometryBounds } from '@/features/gis/utils/bounds'
import { findBarangayAt, nearestCenter } from '@/features/gis/utils/geo'
import type { RiskFeature } from '@/features/gis/types'

import { BarangayDetailModal } from '../components/BarangayDetailModal'
import { EvacuationCard } from '../components/EvacuationCard'
import { HazardCard } from '../components/HazardCard'
import { StatusHero } from '../components/StatusHero'
import { useHomeBarangay } from '../hooks/useHomeBarangay'

/** How much of the screen the info sheet claims, leaving the rest as open map. */
const SHEET_MAX_HEIGHT = '58%'

export function StatusScreen() {
    const theme = useTheme()
    const riskMap = useRiskMap()
    const centers = useEvacuationCenters()
    const home = useHomeBarangay(riskMap.features)
    const { status: locStatus, coords, request } = useCurrentLocation()
    // Pinpoint risk at the resident's exact spot (server-side point-in-polygon).
    const localized = useLocalizedRisk(coords)

    // Turn alerts on for the resident: subscribe them to their home barangay once.
    useAutoSubscribeHome()

    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [focus, setFocus] = useState<MapFocus | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    // Ask for a location fix the first time the tab opens (foreground-only).
    useEffect(() => {
        void request()
    }, [request])

    const current = coords ? findBarangayAt(coords, riskMap.features) : null
    const nearest = coords ? nearestCenter(coords, centers.data?.features) : null

    // Is any of the resident's subscribed barangays under evacuation right now?
    // Prefer the one they're standing in, then their home, then whatever's active.
    const evacuations = useMyEvacuations()
    const homeEvac = useMemo(() => {
        const list = evacuations.data ?? []
        if (list.length === 0) return null
        const currentId = current?.properties.id
        const homeId = home.feature?.properties.id
        return (
            list.find((e) => e.barangay_id === currentId) ??
            list.find((e) => e.barangay_id === homeId) ??
            list[0]
        )
    }, [evacuations.data, current, home.feature])

    // Report this device's status as the resident moves (auto) + power the
    // "I've reached safety" button (manual).
    const reporter = useEvacuationReporter(homeEvac, coords, nearest, riskMap.features)

    // Hide the Home card when the resident is already standing in their home
    // barangay — the two cards would be identical.
    const homeIsCurrent =
        current != null && home.feature != null && current.properties.id === home.feature.properties.id

    // Default framing: the resident's location once we have a fix (falls back to
    // the whole-city view built into RiskMap). A card's "center map here" button
    // overrides this until the coords change again.
    const userFocus = useMemo<MapFocus | null>(
        () => (coords ? { center: [coords.lng, coords.lat] } : null),
        [coords],
    )

    // Recenter the map on a card's barangay (fresh object each tap).
    const focusOn = (feature: RiskFeature | null) => {
        if (!feature) return
        const box = geometryBounds(feature.geometry)
        if (box) setFocus({ center: centroidOf(box) })
    }

    const currentEmpty =
        locStatus === 'denied'
            ? 'Location access is off — enable it to see your current barangay.'
            : locStatus === 'requesting'
              ? 'Locating you…'
              : coords
                ? "You're outside the monitored barangays."
                : 'Your current barangay will appear here.'

    const homeEmpty = home.hasAddress
        ? `Your saved barangay "${home.name}" isn't on the map yet.`
        : 'Set your home barangay in your profile.'

    const nearestEmpty =
        locStatus === 'denied'
            ? 'Enable location to find the nearest center.'
            : centers.data && centers.data.features.length === 0
              ? 'No evacuation centers are listed yet.'
              : 'The nearest evacuation center will appear here.'

    const onRefresh = async () => {
        setRefreshing(true)
        riskMap.refetch()
        centers.refetch()
        localized.refetch()
        await request()
        setRefreshing(false)
    }

    if (riskMap.isLoading) {
        return (
            <View style={[styles.flex, styles.center, { backgroundColor: theme.colors.bg }]}>
                <Spinner />
            </View>
        )
    }

    if (riskMap.isError) {
        return (
            <View style={[styles.flex, styles.errorPad, { backgroundColor: theme.colors.bg }]}>
                <ErrorState
                    title="Can't load flood status"
                    message="We couldn't reach the flood service. Check your connection and try again."
                    onRetry={riskMap.refetch}
                />
            </View>
        )
    }

    return (
        <View style={styles.flex}>
            {/* The map is the screen — everything else floats on top of it. */}
            <RiskMap
                data={riskMap.features}
                centers={centers.data}
                selectedId={selectedId}
                onSelect={setSelectedId}
                showUser={locStatus === 'granted'}
                interactive
                fill
                focus={focus ?? userFocus}
            />

            {homeEvac ? (
                <View style={styles.bannerOverlay} pointerEvents="box-none">
                    <EvacuationBanner
                        evacuation={homeEvac}
                        nearest={nearest}
                        onMarkSafe={reporter.markSafe}
                        isReporting={reporter.isReporting}
                        locationEnabled={locStatus === 'granted'}
                    />
                </View>
            ) : null}

            <View
                style={[
                    styles.sheet,
                    { backgroundColor: theme.colors.bg, borderColor: theme.colors.border },
                ]}
            >
                <View style={[styles.grabber, { backgroundColor: theme.colors.border }]} />
                <ScrollView
                    contentContainerStyle={styles.sheetBody}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.heading}>
                        <Text variant="title">Flood status</Text>
                        {riskMap.computedAt ? (
                            <Text variant="caption" color="textMuted">
                                Updated {timeAgo(riskMap.computedAt)}
                            </Text>
                        ) : null}
                    </View>

                    <StatusHero feature={current} localized={localized.data} emptyMessage={currentEmpty} />

                    <HazardCard
                        label="Current location"
                        feature={current}
                        emptyMessage={currentEmpty}
                        onPress={setSelectedId}
                        onFocus={current ? () => focusOn(current) : undefined}
                    />
                    {locStatus === 'denied' ? (
                        <Button label="Enable location" variant="secondary" onPress={() => void request()} />
                    ) : null}

                    {!homeIsCurrent ? (
                        <HazardCard
                            label="Home"
                            feature={home.feature}
                            emptyMessage={homeEmpty}
                            onPress={setSelectedId}
                            onFocus={home.feature ? () => focusOn(home.feature) : undefined}
                        />
                    ) : null}

                    <EvacuationCard nearest={nearest} emptyMessage={nearestEmpty} />
                </ScrollView>
            </View>

            <BarangayDetailModal barangayId={selectedId} onClose={() => setSelectedId(null)} />
        </View>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center' },
    errorPad: { padding: spacing.lg },
    bannerOverlay: {
        position: 'absolute',
        top: spacing.lg,
        left: spacing.lg,
        right: spacing.lg,
    },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: SHEET_MAX_HEIGHT,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 8,
    },
    grabber: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 2,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    heading: { gap: spacing.xs },
    sheetBody: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
})
