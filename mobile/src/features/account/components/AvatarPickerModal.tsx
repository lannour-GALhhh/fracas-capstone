import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Text } from '@/common/ui'

import { AVATAR_GROUPS } from '../avatar/avatars'

interface Props {
    visible: boolean
    selectedId?: string
    onSelect: (id: string) => void
    onClose: () => void
}

/** Sheet for choosing a profile picture from the bundled avatars. */
export function AvatarPickerModal({ visible, selectedId, onSelect, onClose }: Props) {
    const { colors } = useTheme()

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable
                    style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}
                    onPress={() => {}}
                >
                    <Text variant="subtitle" style={styles.centered}>
                        Choose your avatar
                    </Text>
                    <ScrollView contentContainerStyle={styles.content}>
                        {AVATAR_GROUPS.map((group) => (
                            <View key={group.title} style={styles.group}>
                                <Text variant="label" color="textMuted">
                                    {group.title}
                                </Text>
                                <View style={styles.grid}>
                                    {group.options.map((o) => {
                                        const active = o.id === selectedId
                                        return (
                                            <Pressable
                                                key={o.id}
                                                accessibilityRole="button"
                                                accessibilityLabel={`${o.label} avatar`}
                                                accessibilityState={{ selected: active }}
                                                onPress={() => {
                                                    onSelect(o.id)
                                                    onClose()
                                                }}
                                                style={[
                                                    styles.item,
                                                    { borderColor: active ? colors.primary : 'transparent' },
                                                ]}
                                            >
                                                <Image source={o.source} style={styles.img} />
                                            </Pressable>
                                        )
                                    })}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    card: {
        borderRadius: radius.lg,
        borderWidth: 1,
        padding: spacing.lg,
        gap: spacing.md,
        maxHeight: '80%',
    },
    centered: { textAlign: 'center' },
    content: { gap: spacing.lg },
    group: { gap: spacing.sm },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
    item: { borderWidth: 3, borderRadius: radius.pill, padding: 2 },
    img: { width: 64, height: 64, borderRadius: radius.pill },
})
