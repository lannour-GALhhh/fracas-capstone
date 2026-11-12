import { Modal, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Button, Text } from '@/common/ui'

import { useUpdateNotice } from './useUpdateNotice'

/** Shown once after the app relaunches into a freshly downloaded EAS update. */
export function UpdateNoticeModal() {
    const theme = useTheme()
    const { visible, dismiss } = useUpdateNotice()

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
            <View style={styles.backdrop}>
                <View style={[styles.card, { backgroundColor: theme.colors.bg }]}>
                    <Text variant="title" style={styles.center}>
                        Update complete
                    </Text>
                    <Text style={styles.center}>The app has been updated to the latest version.</Text>
                    <Button label="Close" onPress={dismiss} />
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    card: { width: '100%', maxWidth: 360, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
    center: { textAlign: 'center' },
})
