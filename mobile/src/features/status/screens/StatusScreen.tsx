import { useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorState } from '@/common/components/ErrorState'
import { spacing, useTheme } from '@/common/theme'
import { Button, Spinner, Text } from '@/common/ui'
import { useCurrentLocation } from '@/common/hooks/useCurrentLocation'
import { timeAgo } from '@/common/utils/time'
import { useDamStatus } from '@/features/gis/hooks/useDamStatus'
import { useEvacuationCenters } from '@/features/gis/hooks/useEvacuationCenters'
import { useRiskMap } from '@/features/gis/hooks/useRiskMap'
import { findBarangayAt, nearestCenter } from '@/features/gis/utils/geo'

import { BarangayDetailModal } from '../components/BarangayDetailModal'
import { DamStatusCard } from '../components/DamStatusCard'
import { EvacuationCard } from '../components/EvacuationCard'
import { HazardCard } from '../components/HazardCard'
import { useHomeBarangay } from '../hooks/useHomeBarangay'

export function StatusScreen() {
    const theme = useTheme()
    const riskMap = useRiskMap()
    const centers = useEvacuationCenters()
    const dam = useDamStatus()
    const home = useHomeBarangay(riskMap.features)
    const { status: locStatus, coords, request } = useCurrentLocation()

    const [selectedId, setSelectedId] = useState<number | null>(null)
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
        dam.refetch()
        await request()
        setRefreshing(false)
    }

    return (
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['top']}>
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

                    <HazardCard
                        label="You are here"
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

                    <DamStatusCard data={dam.data} isLoading={dam.isLoading} />
                </ScrollView>
            )}

            <BarangayDetailModal barangayId={selectedId} onClose={() => setSelectedId(null)} />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    body: { padding: spacing.lg, gap: spacing.lg },
    heading: { gap: spacing.xs },
})
