import { Pressable, StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Card, Text } from '@/common/ui'

interface Props {
    title: string
    description: string
    onPress: () => void
}

/** Tappable navigation row: title + description + chevron. */
export function LinkCard({ title, description, onPress }: Props) {
    const theme = useTheme()
    return (
        <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
            <Card style={styles.card}>
                <View style={styles.copy}>
                    <Text variant="label">{title}</Text>
                    <Text variant="caption" color="textMuted">
                        {description}
                    </Text>
                </View>
                <Text style={[styles.chevron, { color: theme.colors.textMuted }]}>›</Text>
            </Card>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    copy: { flex: 1, gap: spacing.xs },
    chevron: { fontSize: 24 },
    pressed: { opacity: 0.7 },
})
