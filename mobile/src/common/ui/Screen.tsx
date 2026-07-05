import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native'
import { SafeAreaView, type Edge } from 'react-native-safe-area-context'

import { spacing, useTheme } from '@/common/theme'

interface Props {
    children: ReactNode
    /** Wrap content in a ScrollView (default true). */
    scroll?: boolean
    /** Apply default horizontal + vertical padding (default true). */
    padded?: boolean
    /** Safe-area edges to inset (default top + bottom). */
    edges?: readonly Edge[]
    style?: ViewStyle
}

/** Safe-area screen container with optional scroll + standard padding. */
export function Screen({
    children,
    scroll = true,
    padded = true,
    edges = ['top', 'bottom'],
    style,
}: Props) {
    const theme = useTheme()
    const contentStyle = [padded && styles.padded, style]

    return (
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={edges}>
            {scroll ? (
                <ScrollView
                    contentContainerStyle={[styles.grow, contentStyle]}
                    keyboardShouldPersistTaps="handled"
                >
                    {children}
                </ScrollView>
            ) : (
                <View style={[styles.flex, contentStyle]}>{children}</View>
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    grow: { flexGrow: 1 },
    padded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
})
