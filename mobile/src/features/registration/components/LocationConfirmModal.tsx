import { Modal, Pressable, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Button, Icon, Text } from '@/common/ui'

interface Props {
    visible: boolean
    onCancel: () => void
    /** Resident confirms they are standing at their permanent address. */
    onConfirm: () => void
}

/**
 * In-app confirmation for the GPS address path. A custom sheet rather than
 * `Alert.alert` so the copy, spacing, and theming match the rest of the wizard —
 * and so the reading time isn't spent in a system dialog the resident dismisses
 * by reflex, since the accuracy of the fix depends on them actually standing still.
 */
export function LocationConfirmModal({ visible, onCancel, onConfirm }: Props) {
    const { colors } = useTheme()

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <Pressable style={styles.backdrop} onPress={onCancel}>
                {/* Swallow taps on the card itself so only the backdrop dismisses. */}
                <Pressable
                    style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}
                    onPress={() => {}}
                >
                    <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
                        <Icon name="location-sharp" size={26} color={colors.primary} />
                    </View>

                    <Text variant="subtitle" style={styles.centered}>
                        Set your permanent address
                    </Text>
                    <Text variant="body" color="textMuted" style={styles.centered}>
                        Make sure you are currently in your permanent address. Stay seated
                    </Text>

                    <View style={styles.actions}>
                        <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.action} />
                        <Button label="I’m here" onPress={onConfirm} style={styles.action} />
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
        maxWidth: 380,
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
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' },
    action: { flex: 1 },
})
