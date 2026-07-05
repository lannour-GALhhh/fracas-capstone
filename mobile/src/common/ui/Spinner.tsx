import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useTheme } from '@/common/theme'

/** Centered loading indicator that fills its parent. */
export function Spinner() {
    const theme = useTheme()
    return (
        <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
        </View>
    )
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
