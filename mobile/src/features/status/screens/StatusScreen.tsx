import { useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorState } from '@/common/components/ErrorState'
import { spacing, useTheme } from '@/common/theme'
import { Button, Spinner, Text } from '@/common/ui'
import { useCurrentLocation } from '@/common/hooks/useCurrentLocation'
import { timeAgo } from '@/common/utils/time'
import { useAutoSubscribeHome } from '@/features/alerts/hooks/useAutoSubscribeHome'
import { RiskMap } from '@/features/gis/components/RiskMap'
import { useEvacuationCenters } from '@/features/gis/hooks/useEvacuationCenters'
import { useRiskMap } from '@/features/gis/hooks/useRiskMap'
import { findBarangayAt, nearestCenter } from '@/features/gis/utils/geo'

import { BarangayDetailModal } from '../components/BarangayDetailModal'
import { EvacuationCard } from '../components/EvacuationCard'
import { HazardCard } from '../components/HazardCard'
import { MapModal } from '../components/MapModal'
import { StatusHero } from '../components/StatusHero'
import { useHomeBarangay } from '../hooks/useHomeBarangay'

export function StatusScreen() {
    const theme = useTheme()
    const riskMap = useRiskMap()
    const centers = useEvacuationCenters()
    const home = useHomeBarangay(riskMap.features)
    const { status: locStatus, coords, request } = useCurrentLocation()

    // Turn alerts on for the resident: subscribe them to their home barangay once.
    useAutoSubscribeHome()

    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [mapExpanded, setMapExpanded] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    // Ask for a location fix the first time the tab opens (foreground-only).
    useEffect(() => {
        void request()
    }, [request])

    const current = coords ? findBarangayAt(coords, riskMap.features) : null
    const nearest = coords ? nearestCenter(coords, centers.data?.features) : null

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
        await request()
        setRefreshing(false)
    }

    return (
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['bottom']}>
            {riskMap.isLoading ? (
                <Spinner />
            ) : riskMap.isError ? (
                <ErrorState
                    title="Can't load flood status"
                    message="We couldn't reach the flood service. Check your connection and try again."
                    onRetry={riskMap.refetch}
                />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.body}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <View style={styles.heading}>
                        <Text variant="title">Flood status</Text>
                        {riskMap.computedAt ? (
                            <Text variant="caption" color="textMuted">
                                Updated {timeAgo(riskMap.computedAt)}
                            </Text>
                        ) : null}
                    </View>

                    <StatusHero feature={current} emptyMessage={currentEmpty} />

                    <RiskMap
                        data={riskMap.features}
                        centers={centers.data}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        showUser={locStatus === 'granted'}
                        interactive={false}
                        onExpand={() => setMapExpanded(true)}
                    />

                    <HazardCard
                        label="Current location"
                        feature={current}
                        emptyMessage={currentEmpty}
                        onPress={setSelectedId}
                    />
                    {locStatus === 'denied' ? (
                        <Button label="Enable location" variant="secondary" onPress={() => void request()} />
                    ) : null}

                    <HazardCard
                        label="Home"
                        feature={home.feature}
                        emptyMessage={homeEmpty}
                        onPress={setSelectedId}
                    />

                    <EvacuationCard nearest={nearest} emptyMessage={nearestEmpty} />
                </ScrollView>
            )}

            <MapModal
                visible={mapExpanded}
                onClose={() => setMapExpanded(false)}
                data={riskMap.features}
                centers={centers.data}
                showUser={locStatus === 'granted'}
            />

            <BarangayDetailModal barangayId={selectedId} onClose={() => setSelectedId(null)} />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    body: { padding: spacing.lg, gap: spacing.lg },
    heading: { gap: spacing.xs },
})
