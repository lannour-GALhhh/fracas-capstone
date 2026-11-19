import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Button, Icon, Text, type IconName } from '@/common/ui'

export interface ChangeItem {
    label: string
    from: string
    to: string
}

interface Props {
    visible: boolean
    title: string
    /** Plain-language summary; used alone when `changes` is omitted. */
    message?: string
    changes?: ChangeItem[]
    icon?: IconName
    confirmLabel: string
    loading?: boolean
    onCancel: () => void
    onConfirm: () => void
}

/** Confirm sheet for account edits: optional before → after list of changes. */
export function ConfirmChangesModal({
    visible,
    title,
    message,
    changes,
    icon = 'checkmark-circle',
    confirmLabel,
    loading = false,
    onCancel,
    onConfirm,
}: Props) {
    const { colors } = useTheme()

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <Pressable style={styles.backdrop} onPress={onCancel}>
                <Pressable
                    style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}
                    onPress={() => {}}
                >
                    <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
                        <Icon name={icon} size={26} color={colors.primary} />
                    </View>
                    <Text variant="subtitle" style={styles.centered}>
                        {title}
                    </Text>
                    {message ? (
                        <Text variant="body" color="textMuted" style={styles.centered}>
                            {message}
                        </Text>
                    ) : null}

                    {changes?.length ? (
                        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                            {changes.map((c) => (
                                <View
                                    key={c.label}
                                    style={[styles.row, { backgroundColor: colors.surfaceAlt }]}
                                >
                                    <Text variant="label">{c.label}</Text>
                                    <Text variant="caption" color="textMuted">
                                        {c.from || '—'}
                                    </Text>
                                    <Text variant="body">→ {c.to || '—'}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    ) : null}

                    <View style={styles.actions}>
                        <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.action} />
                        <Button
                            label={confirmLabel}
                            onPress={onConfirm}
                            loading={loading}
                            style={styles.action}
                        />
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        maxHeight: '85%',
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        padding: spacing.xl,
        gap: spacing.sm,
        alignItems: 'center',
    },
    badge: {
        width: 52,
        height: 52,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    centered: { textAlign: 'center' },
    list: { alignSelf: 'stretch', flexGrow: 0 },
    listContent: { gap: spacing.sm },
    row: { padding: spacing.md, borderRadius: radius.md, gap: 2 },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' },
    action: { flex: 1 },
})
