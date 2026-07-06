import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Text } from '@/common/ui'

interface Props {
    title: string
    subtitle?: string
}

/** A titled divider between toolkit sections on the screen. */
export function SectionHeader({ title, subtitle }: Props) {
    return (
        <View style={styles.wrap}>
            <Text variant="title">{title}</Text>
            {subtitle ? (
                <Text variant="body" color="textMuted">
                    {subtitle}
                </Text>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    wrap: { gap: spacing.xs, marginTop: spacing.sm },
})
