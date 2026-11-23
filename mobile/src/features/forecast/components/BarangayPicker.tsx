import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { radius, spacing, useTheme } from '@/common/theme'
import { Button, Icon, Input, Text } from '@/common/ui'
import { useBarangays } from '@/features/gis/hooks/useBarangays'

interface Props {
    selectedId: number | null
    onSelect: (id: number) => void
}

/** A button showing the chosen barangay that opens a searchable list to switch it. */
export function BarangayPicker({ selectedId, onSelect }: Props) {
    const theme = useTheme()
    const insets = useSafeAreaInsets()
    const { data } = useBarangays()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')

    const barangays = useMemo(
        () =>
            (data?.features ?? [])
                .map((f) => f.properties)
                .sort((a, b) => a.name.localeCompare(b.name)),
        [data],
    )
    const selected = barangays.find((b) => b.id === selectedId)
    const shown = query.trim()
        ? barangays.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
        : barangays

    const close = () => {
        setOpen(false)
        setQuery('')
    }

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Change barangay"
                style={[styles.button, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
                <View style={styles.flex}>
                    <Text variant="caption" color="textMuted">
                        Barangay
                    </Text>
                    <Text variant="subtitle">{selected?.name ?? 'Choose a barangay'}</Text>
                </View>
                <Icon name="chevron-down" size={20} color={theme.colors.textMuted} />
            </Pressable>

            <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
                <View style={[styles.sheet, { backgroundColor: theme.colors.bg, paddingTop: spacing.lg + insets.top }]}>
                    <View style={styles.head}>
                        <Text variant="title">Choose barangay</Text>
                        <Button label="Close" variant="ghost" onPress={close} style={styles.close} />
                    </View>
                    <Input
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search barangay"
                        autoCorrect={false}
                        style={styles.search}
                    />
                    <FlatList
                        data={shown}
                        keyExtractor={(b) => String(b.id)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => {
                                    onSelect(item.id)
                                    close()
                                }}
                                style={styles.item}
                                accessibilityRole="button"
                            >
                                <Text variant="body">{item.name}</Text>
                                {item.id === selectedId ? (
                                    <Icon name="checkmark" size={20} color={theme.colors.primary} />
                                ) : null}
                            </Pressable>
                        )}
                    />
                </View>
            </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
    },
    sheet: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    close: { minHeight: 40, paddingHorizontal: spacing.md },
    search: { marginBottom: spacing.xs },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
    },
})
