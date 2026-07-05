import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Text } from '@/common/ui'

interface Props {
    title?: string
    message?: string
    onRetry?: () => void
}

/** Centered error message with an optional retry action. */
export function ErrorState({
    title = 'Something went wrong',
    message = 'Please check your connection and try again.',
    onRetry,
}: Props) {
    return (
        <View style={styles.center}>
            <Text variant="subtitle">{title}</Text>
            <Text variant="body" color="textMuted" style={styles.message}>
                {message}
            </Text>
            {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
        </View>
    )
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    message: { textAlign: 'center' },
})
