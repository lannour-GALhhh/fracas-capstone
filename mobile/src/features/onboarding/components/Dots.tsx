import { StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'

/** Page indicator. */
export function Dots({ count, index }: { count: number; index: number }) {
    const theme = useTheme()
    return (
        <View style={styles.row} accessibilityLabel={`Step ${index + 1} of ${count}`}>
            {Array.from({ length: count }, (_, i) => (
                <View
                    key={i}
                    style={[
                        styles.dot,
                        { backgroundColor: i === index ? theme.colors.primary : theme.colors.border },
                        i === index && styles.active,
                    ]}
                />
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
    dot: { width: 8, height: 8, borderRadius: radius.sm },
    active: { width: 22 },
})
