import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Text } from '@/common/ui'

interface Props {
    title: string
    message?: string
}

/** Centered "nothing here yet" placeholder. */
export function EmptyState({ title, message }: Props) {
    return (
        <View style={styles.center}>
            <Text variant="subtitle">{title}</Text>
            {message ? (
                <Text variant="body" color="textMuted" style={styles.message}>
                    {message}
                </Text>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
    message: { textAlign: 'center' },
})
