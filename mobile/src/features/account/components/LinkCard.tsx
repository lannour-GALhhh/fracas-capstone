import { Pressable, StyleSheet } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Card, Icon, type IconName, Text } from '@/common/ui'

interface Props {
    title: string
    icon: IconName
    onPress: () => void
}

/** Tappable navigation row: leading icon + title + chevron. */
export function LinkCard({ title, icon, onPress }: Props) {
    const theme = useTheme()
    return (
        <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
            <Card style={styles.card}>
                <Icon name={icon} size={22} color={theme.colors.primary} />
                <Text variant="label" style={styles.title}>
                    {title}
                </Text>
                <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Card>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    title: { flex: 1 },
    pressed: { opacity: 0.7 },
})
