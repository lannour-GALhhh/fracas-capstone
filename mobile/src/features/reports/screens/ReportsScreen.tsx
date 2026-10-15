import { useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '@/common/components/EmptyState'
import { ErrorState } from '@/common/components/ErrorState'
import { spacing, useTheme } from '@/common/theme'
import { Icon, Spinner, Text } from '@/common/ui'

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
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Text variant="title">Reports</Text>
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

            <Pressable
                onPress={() => setComposing(true)}
                accessibilityRole="button"
                accessibilityLabel="New report"
                style={({ pressed }) => [
                    styles.fab,
                    { backgroundColor: theme.colors.primary },
                    pressed && styles.pressed,
                ]}
            >
                <Icon name="camera" size={26} color="#fff" />
                <View style={styles.plus}>
                    <Icon name="add" size={14} color="#fff" />
                </View>
            </Pressable>

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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    list: { padding: spacing.lg, paddingBottom: 96, gap: spacing.md, flexGrow: 1 },
    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.lg,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },
    plus: { position: 'absolute', top: 14, right: 12 },
    pressed: { opacity: 0.8 },
})
