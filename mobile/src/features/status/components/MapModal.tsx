import { useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spacing, useTheme } from '@/common/theme'
import { Icon, Text } from '@/common/ui'
import { type MapFocus, RiskMap } from '@/features/gis/components/RiskMap'
import type { EvacuationCenterCollection, RiskFeatureCollection } from '@/features/gis/types'

import { HazardCard } from './HazardCard'

interface Props {
    visible: boolean
    onClose: () => void
    data: RiskFeatureCollection | null
    centers: EvacuationCenterCollection | undefined
    showUser: boolean
    /** Where to center when it opens — the resident's general location. */
    focus?: MapFocus | null
}

/**
 * Full-screen, draggable version of the status map. The card on the status page
 * is intentionally locked to the resident's area; this is where they can pan and
 * zoom to inspect other barangays. Opens focused on their location; tapping a
 * barangay shows its hazard at the bottom.
 */
export function MapModal({ visible, onClose, data, centers, showUser, focus = null }: Props) {
    const theme = useTheme()
    const insets = useSafeAreaInsets()
    const [selectedId, setSelectedId] = useState<number | null>(null)

    const selected = selectedId == null ? null : (data?.features.find((f) => f.properties.id === selectedId) ?? null)

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
                <RiskMap
                    data={data}
                    centers={centers}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    showUser={showUser}
                    interactive
                    fill
                    focus={focus}
                />

                {/* Header overlay: title + close, kept clear of the status bar. */}
                <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
                    <View style={[styles.pill, { backgroundColor: theme.colors.bg, borderColor: theme.colors.border }]}>
                        <Text variant="label">Explore the map</Text>
                    </View>
                    <Pressable
                        onPress={onClose}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Close map"
                        style={({ pressed }) => [
                            styles.close,
                            { backgroundColor: theme.colors.bg, borderColor: theme.colors.border },
                            pressed && styles.pressed,
                        ]}
                    >
                        <Icon name="close" size={20} color={theme.colors.text} />
                    </Pressable>
                </View>

                {selected ? (
                    <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
                        <HazardCard label="Selected barangay" feature={selected} emptyMessage="" />
                    </View>
                ) : null}
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
    },
    close: {
        width: 38,
        height: 38,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: { opacity: 0.6 },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.md,
    },
})
