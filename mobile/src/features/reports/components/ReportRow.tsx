import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, Text } from '@/common/ui'
import { timeAgo } from '@/common/utils/time'

import { STATUS_META } from '../constants'
import type { FloodReport } from '../types'

/** One of the resident's submitted reports: thumbnail, status tag, barangay, sent time. */
export function ReportRow({ report }: { report: FloodReport }) {
    const theme = useTheme()
    const { label, icon, color } = STATUS_META[report.status]
    const cover = report.images[0]?.image

    return (
        <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.thumb, { backgroundColor: theme.colors.surfaceAlt }]}>
                {cover ? <Image source={{ uri: cover }} style={styles.fill} contentFit="cover" /> : null}
                {report.images.length > 1 ? (
                    <View style={styles.count}>
                        <Text variant="caption" style={styles.countText}>
                            +{report.images.length - 1}
                        </Text>
                    </View>
                ) : null}
            </View>
            <View style={styles.content}>
                <View style={styles.status}>
                    <Icon name={icon} size={16} color={color} />
                    <Text variant="label" style={{ color }}>
                        {label}
                    </Text>
                </View>
                <Text variant="label">{report.barangay_name ?? 'Unknown barangay'}</Text>
                {report.description ? (
                    <Text variant="caption" color="textMuted" numberOfLines={2}>
                        {report.description}
                    </Text>
                ) : null}
                {report.status === 'rejected' && report.review_note ? (
                    <Text variant="caption" color="danger" numberOfLines={2}>
                        {report.review_note}
                    </Text>
                ) : null}
                <Text variant="caption" color="textMuted">
                    Sent {timeAgo(report.created_at)}
                </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
    },
    thumb: { width: 84, height: 84, borderRadius: radius.md, overflow: 'hidden' },
    fill: { width: '100%', height: '100%' },
    count: {
        position: 'absolute',
        right: 4,
        bottom: 4,
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderRadius: radius.pill,
        paddingHorizontal: 6,
    },
    countText: { color: '#fff', fontWeight: '700' },
    content: { flex: 1, gap: 2 },
    status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
})
