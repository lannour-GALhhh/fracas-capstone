import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '@/common/components/EmptyState'
import { ErrorState } from '@/common/components/ErrorState'
import { spacing, useTheme } from '@/common/theme'
import { Button, Spinner, Text } from '@/common/ui'

import { NotificationDetailModal } from '../components/NotificationDetailModal'
import { NotificationRow } from '../components/NotificationRow'
import { useMarkAllRead } from '../hooks/useNotificationMutations'
import { useNotifications } from '../hooks/useNotifications'
import { useUnreadCount } from '../hooks/useUnreadCount'
import type { Notification } from '../types'

/** The resident's flood-alert feed: newest first, tap a row for the full advisory. */
export function AlertsScreen() {
    const theme = useTheme()
    const {
        notifications,
        isLoading,
        isError,
        refetch,
        isRefetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useNotifications()
    const unread = useUnreadCount()
    const markAll = useMarkAllRead()

    const [selected, setSelected] = useState<Notification | null>(null)
    const hasUnread = (unread.data ?? 0) > 0

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['bottom']}>
                <Spinner />
            </SafeAreaView>
        )
    }

    if (isError) {
        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['bottom']}>
                <ErrorState
                    title="Can't load alerts"
                    message="We couldn't reach the alerts service. Check your connection and try again."
                    onRetry={refetch}
                />
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['bottom']}>
            <View style={styles.header}>
                <View style={styles.heading}>
                    <Text variant="title">Alerts</Text>
                    {hasUnread ? (
                        <Text variant="caption" color="textMuted">
                            {unread.data} unread
                        </Text>
                    ) : null}
                </View>
                {hasUnread ? (
                    <Button
                        label="Mark all read"
                        variant="ghost"
                        onPress={() => markAll.mutate()}
                        loading={markAll.isPending}
                        style={styles.markAll}
                    />
                ) : null}
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <NotificationRow notification={item} onPress={setSelected} />
                )}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
                onEndReachedThreshold={0.4}
                onEndReached={() => hasNextPage && fetchNextPage()}
                ListEmptyComponent={
                    <EmptyState
                        title="No alerts yet"
                        message="Flood advisories for your barangay will appear here."
                    />
                }
                ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
            />

            <NotificationDetailModal notification={selected} onClose={() => setSelected(null)} />
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
    heading: { gap: spacing.xs },
    markAll: { minHeight: 40, paddingHorizontal: spacing.md },
    list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
})
