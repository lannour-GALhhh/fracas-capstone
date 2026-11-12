import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spacing, useTheme } from '@/common/theme'
import { Button, Text } from '@/common/ui'
import { ToolkitScreen } from '@/features/toolkit/screens/ToolkitScreen'

import { useOnlineStatus } from './useOnlineStatus'

/**
 * When the server can't be reached, cover the app with the (fully bundled) disaster
 * toolkit so a resident in a flood with no signal still gets guidance and hotlines.
 * It is an overlay, not a replacement for the navigator, so the resident returns to
 * exactly where they were once the connection comes back.
 */
export function OfflineGate() {
    const theme = useTheme()
    const insets = useSafeAreaInsets()
    const { online, checking, retry } = useOnlineStatus()

    if (online) return null

    return (
        <View style={[styles.overlay, { backgroundColor: theme.colors.bg }]}>
            <View style={[styles.banner, { backgroundColor: theme.colors.surfaceAlt, paddingTop: insets.top + spacing.sm }]}>
                <View style={styles.bannerText}>
                    <Text variant="label">You&apos;re offline</Text>
                    <Text variant="caption" color="textMuted">
                        Live flood data is unavailable. The toolkit still works.
                    </Text>
                </View>
                <Button label="Retry" variant="ghost" onPress={() => void retry()} loading={checking} style={styles.retry} />
            </View>
            <View style={styles.flex}>
                <ToolkitScreen edges={['bottom']} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
    flex: { flex: 1 },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    bannerText: { flex: 1 },
    retry: { minHeight: 36, paddingHorizontal: spacing.md },
})
