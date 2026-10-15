import { Image } from 'expo-image'
import { router, type Href } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, Text } from '@/common/ui'

import { STATUS_META } from '../constants'
import type { FloodReport } from '../types'

/** One of the resident's submitted reports: square photo, barangay, one-line description, status icon. */
export function ReportRow({ report }: { report: FloodReport }) {
    const theme = useTheme()
    const { icon, color } = STATUS_META[report.status]
    const cover = report.images[0]?.image

    return (
        <Pressable
            onPress={() => router.push(`/report/${report.id}` as Href)}
            accessibilityRole="button"
            accessibilityLabel={`Open report from ${report.barangay_name ?? 'unknown barangay'}`}
            style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                pressed && styles.pressed,
            ]}
        >
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
                    <Icon name={icon} size={22} color={color} />
                </View>
                <Text variant="label" numberOfLines={1}>
                    {report.barangay_name ?? 'Unknown barangay'}
                </Text>
                {report.description ? (
                    <Text variant="caption" color="textMuted" numberOfLines={1}>
                        {report.description}
                    </Text>
                ) : null}
            </View>
        </Pressable>
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
    thumb: { width: '50%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden' },
    pressed: { opacity: 0.85 },
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
    status: { alignItems: 'flex-end' },
})
