import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '@/common/components/EmptyState'
import { ErrorState } from '@/common/components/ErrorState'
import { spacing, useTheme } from '@/common/theme'
import { Button, Spinner, Text } from '@/common/ui'

import { NewReportModal } from '../components/NewReportModal'
import { ReportRow } from '../components/ReportRow'
import { useMyReports } from '../hooks/useMyReports'

/** The resident's flood photo reports, with a button to submit a new one. */
export function ReportsScreen() {
    const theme = useTheme()
    const { reports, isLoading, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useMyReports()
    const [composing, setComposing] = useState(false)

    return (
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['bottom']}>
            <View style={styles.header}>
                <Text variant="title">Reports</Text>
                <Button label="New report" onPress={() => setComposing(true)} style={styles.new} />
            </View>

            {isLoading ? (
                <Spinner />
            ) : isError ? (
                <ErrorState
                    title="Can't load reports"
                    message="We couldn't reach the server. Check your connection and try again."
                    onRetry={refetch}
                />
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={(r) => String(r.id)}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => <ReportRow report={item} />}
                    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                    onEndReachedThreshold={0.4}
                    onEndReached={() => hasNextPage && fetchNextPage()}
                    ListEmptyComponent={
                        <EmptyState
                            title="No reports yet"
                            message="Seeing flooding? Send photos so responders can verify what's happening."
                        />
                    }
                    ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
                />
            )}

            <NewReportModal
                visible={composing}
                onClose={() => setComposing(false)}
                onSubmitted={() => setComposing(false)}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    new: { minHeight: 40, paddingHorizontal: spacing.lg },
    list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
})
