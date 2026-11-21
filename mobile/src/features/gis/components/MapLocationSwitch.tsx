import { Pressable, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, Text, type IconName } from '@/common/ui'

export type LocationMode = 'current' | 'home'

const OPTIONS: { mode: LocationMode; label: string; icon: IconName }[] = [
    { mode: 'current', label: 'Your Current Location', icon: 'locate' },
    { mode: 'home', label: 'Home Address', icon: 'home' },
]

interface Props {
    value: LocationMode
    onChange: (mode: LocationMode) => void
    /** Disable a mode that has nothing to focus on (no GPS fix / no home barangay). */
    disabled?: Partial<Record<LocationMode, boolean>>
}

/** Pill switch: the active option shows icon + label on primary; the other is icon-only. */
export function MapLocationSwitch({ value, onChange, disabled = {} }: Props) {
    const theme = useTheme()
    return (
        <View style={[styles.pill, { backgroundColor: theme.colors.bg, borderColor: theme.colors.border }]}>
            {OPTIONS.map(({ mode, label, icon }) => {
                const active = value === mode
                const off = disabled[mode]
                return (
                    <Pressable
                        key={mode}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        accessibilityState={{ selected: active, disabled: off }}
                        disabled={off}
                        onPress={() => onChange(mode)}
                        style={[
                            styles.segment,
                            active && { backgroundColor: theme.colors.primary },
                            off && styles.off,
                        ]}
                    >
                        <Icon name={icon} size={20} color={active ? theme.colors.onPrimary : '#000000'} />
                        {active ? (
                            <Text style={[styles.label, { color: theme.colors.onPrimary }]}>{label}</Text>
                        ) : null}
                    </Pressable>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignSelf: 'flex-end',
        padding: 3,
        gap: 2,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    segment: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        height: 36,
        minWidth: 36,
        paddingHorizontal: spacing.sm + 2,
        borderRadius: radius.pill,
        justifyContent: 'center',
    },
    off: { opacity: 0.4 },
    label: { fontSize: 14, fontWeight: '700' },
})
