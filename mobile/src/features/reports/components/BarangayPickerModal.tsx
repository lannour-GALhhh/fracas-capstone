import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spacing, useTheme } from '@/common/theme'
import { Button, Input, Text } from '@/common/ui'
import { useBarangays } from '@/features/gis/hooks/useBarangays'

interface Props {
    visible: boolean
    onClose: () => void
    onPick: (barangay: { id: number; name: string }) => void
}

/** Searchable barangay list — the fallback when GPS isn't available. */
export function BarangayPickerModal({ visible, onClose, onPick }: Props) {
    const theme = useTheme()
    const insets = useSafeAreaInsets()
    const { data } = useBarangays()
    const [query, setQuery] = useState('')

    const options = useMemo(
        () =>
            (data?.features ?? [])
                .map((f) => ({ id: f.properties.id, name: f.properties.name }))
                .filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [data, query],
    )

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.sheet, { backgroundColor: theme.colors.bg }]}>
                <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                    <Text variant="title">Choose barangay</Text>
                    <Button label="Close" variant="ghost" onPress={onClose} style={styles.close} />
                </View>
                <View style={styles.search}>
                    <Input value={query} onChangeText={setQuery} placeholder="Search barangay" autoCorrect={false} />
                </View>
                <FlatList
                    data={options}
                    keyExtractor={(b) => String(b.id)}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => {
                                onPick(item)
                                setQuery('')
                            }}
                            style={[styles.item, { borderBottomColor: theme.colors.border }]}
                        >
                            <Text>{item.name}</Text>
                        </Pressable>
                    )}
                />
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    sheet: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    close: { minHeight: 40, paddingHorizontal: spacing.md },
    search: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    item: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
})
