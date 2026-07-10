import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'

import { Icon } from './Icon'
import { Text } from './Text'

interface Props {
    checked: boolean
    onToggle: () => void
    children: ReactNode
}

/** Checkbox + inline label row (the label may contain links/emphasis). */
export function Checkbox({ checked, onToggle, children }: Props) {
    const theme = useTheme()
    return (
        <Pressable onPress={onToggle} style={styles.row}>
            <View
                style={[
                    styles.box,
                    {
                        borderColor: checked ? theme.colors.primary : theme.colors.border,
                        backgroundColor: checked ? theme.colors.primary : 'transparent',
                    },
                ]}
            >
                {checked ? (
                    <Icon name="checkmark" size={16} color={theme.colors.onPrimary} />
                ) : null}
            </View>
            <View style={styles.label}>
                {typeof children === 'string' ? <Text variant="body">{children}</Text> : children}
            </View>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    box: {
        width: 22,
        height: 22,
        borderRadius: radius.sm,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: { flex: 1 },
})
