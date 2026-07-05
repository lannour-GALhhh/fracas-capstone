import type { ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'

interface Props {
    children: ReactNode
    style?: ViewStyle
}

/** Surface container with padding + rounded corners + hairline border. */
export function Card({ children, style }: Props) {
    const theme = useTheme()
    return (
        <View
            style={[
                styles.base,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                style,
            ]}
        >
            {children}
        </View>
    )
}

const styles = StyleSheet.create({
    base: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.sm,
    },
})
