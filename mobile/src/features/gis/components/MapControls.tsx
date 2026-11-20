import { Pressable, StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Icon } from '@/common/ui'

interface Props {
    onCenterMe: () => void
    centerDisabled?: boolean
    guideOn: boolean
    onToggleGuide: () => void
    guideDisabled?: boolean
}

/** Bottom-right map buttons: nearest-center guide toggle (top) and center-on-me (bottom). */
export function MapControls({ onCenterMe, centerDisabled, guideOn, onToggleGuide, guideDisabled }: Props) {
    const theme = useTheme()
    const base = [styles.btn, { backgroundColor: theme.colors.bg, borderColor: theme.colors.border }]
    return (
        <View style={styles.stack} pointerEvents="box-none">
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show direction to nearest evacuation center"
                accessibilityState={{ selected: guideOn, disabled: guideDisabled }}
                disabled={guideDisabled}
                onPress={onToggleGuide}
                style={[base, guideOn && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, guideDisabled && styles.off]}
            >
                <Icon name="navigate" size={22} color={guideOn ? theme.colors.onPrimary : theme.colors.text} />
            </Pressable>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Center map on my location"
                disabled={centerDisabled}
                onPress={onCenterMe}
                style={[base, centerDisabled && styles.off]}
            >
                <Icon name="locate" size={22} color={theme.colors.primary} />
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    // Sits just above the collapsed bottom sheet (20% of the screen).
    stack: { position: 'absolute', right: spacing.lg, bottom: '20%', marginBottom: spacing.md, gap: spacing.sm },
    btn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    off: { opacity: 0.4 },
})
