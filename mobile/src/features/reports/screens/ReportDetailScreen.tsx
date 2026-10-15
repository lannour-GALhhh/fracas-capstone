import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'

import { EmptyState } from '@/common/components/EmptyState'
import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, Spinner, Text, type IconName } from '@/common/ui'

import { STATUS_META } from '../constants'
import { useMyReports } from '../hooks/useMyReports'

function formatDateTime(iso: string): string {
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
        ? iso
        : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function DetailRow({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
    const theme = useTheme()
    return (
        <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Icon name={icon} size={18} color={theme.colors.textMuted} />
            </View>
            <View style={styles.flex}>
                <Text variant="caption" color="textMuted">
                    {label}
                </Text>
                {children}
            </View>
        </View>
    )
}

/** Full view of one of the resident's reports: photos up top, every detail below. */
export function ReportDetailScreen() {
    const theme = useTheme()
    const { width } = useWindowDimensions()
    const { id } = useLocalSearchParams<{ id: string }>()
    const { reports, isLoading } = useMyReports()
    const [page, setPage] = useState(0)
    const [viewerAt, setViewerAt] = useState<number | null>(null)

    const report = reports.find((r) => String(r.id) === id)
    if (isLoading) return <Spinner />
    if (!report) return <EmptyState title="Report not found" message="It may have been removed." />

    const { label, icon, color } = STATUS_META[report.status]

    return (
        <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
            <View style={{ width, height: width, backgroundColor: theme.colors.surfaceAlt }}>
                <FlatList
                    data={report.images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(img) => String(img.id)}
                    onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
                    renderItem={({ item, index }) => (
                        <Pressable
                            onPress={() => setViewerAt(index)}
                            accessibilityRole="imagebutton"
                            accessibilityLabel="View full image"
                        >
                            <Image source={{ uri: item.image }} style={{ width, height: width }} contentFit="cover" />
                        </Pressable>
                    )}
                />
                <View style={[styles.statusPill, { backgroundColor: color }]} pointerEvents="none">
                    <Icon name={icon} size={16} color="#fff" />
                    <Text variant="label" style={styles.statusText}>
                        {label}
                    </Text>
                </View>
                {report.images.length > 1 ? (
                    <View style={styles.pager} pointerEvents="none">
                        <Text variant="caption" style={styles.pagerText}>
                            {page + 1}/{report.images.length}
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.body}>
                <View style={styles.meta}>
                    <View style={styles.metaItem}>
                        <Icon name="location-outline" size={16} color={theme.colors.textMuted} />
                        <Text variant="label" numberOfLines={1} style={styles.flex}>
                            {report.barangay_name ?? 'Unknown barangay'}
                        </Text>
                    </View>
                    <View style={styles.metaDate}>
                        <Icon name="time-outline" size={16} color={theme.colors.textMuted} />
                        <Text variant="caption" color="textMuted">
                            {formatDateTime(report.created_at)}
                        </Text>
                    </View>
                </View>

                <View style={[styles.descBox, { borderColor: theme.colors.border }]}>
                    <Text variant="body" color={report.description ? undefined : 'textMuted'}>
                        {report.description || 'No description provided.'}
                    </Text>
                </View>
                {report.review_note ? (
                    <DetailRow icon="chatbubble-ellipses-outline" label="Reviewer note">
                        <Text variant="body" color={report.status === 'rejected' ? 'danger' : undefined}>
                            {report.review_note}
                        </Text>
                    </DetailRow>
                ) : null}
            </View>

            <Modal visible={viewerAt !== null} transparent={false} animationType="fade" onRequestClose={() => setViewerAt(null)}>
                <View style={styles.viewer}>
                    <FlatList
                        data={report.images}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={viewerAt ?? 0}
                        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
                        keyExtractor={(img) => String(img.id)}
                        onMomentumScrollEnd={(e) => setViewerAt(Math.round(e.nativeEvent.contentOffset.x / width))}
                        renderItem={({ item }) => (
                            <Image source={{ uri: item.image }} style={{ width, height: '100%' }} contentFit="contain" />
                        )}
                    />
                    <Pressable
                        onPress={() => {
                            if (viewerAt !== null) setPage(viewerAt)
                            setViewerAt(null)
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        style={styles.close}
                        hitSlop={12}
                    >
                        <Icon name="close" size={24} color="#fff" />
                    </Pressable>
                    {report.images.length > 1 ? (
                        <View style={styles.viewerCount} pointerEvents="none">
                            <Text variant="caption" style={styles.pagerText}>
                                {(viewerAt ?? 0) + 1}/{report.images.length}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </Modal>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingBottom: spacing.xl },
    pager: {
        position: 'absolute',
        right: spacing.md,
        bottom: spacing.md,
        backgroundColor: '#000',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    pagerText: { color: '#fff', fontWeight: '700' },
    body: { padding: spacing.lg, gap: spacing.lg },
    statusPill: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
    },
    statusText: { color: '#fff' },
    descBox: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
    meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    metaDate: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
    viewer: { flex: 1, backgroundColor: '#000' },
    close: {
        position: 'absolute',
        top: spacing.xl,
        right: spacing.lg,
        padding: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    viewerCount: {
        position: 'absolute',
        bottom: spacing.xl,
        right: spacing.lg,
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    detailRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    detailIcon: {
        width: 36,
        height: 36,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
