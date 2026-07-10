import { type ReactNode, useState } from 'react'
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

// Enable smooth expand/collapse on Android (a no-op on iOS, where it's default).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface Props {
    title: string
    subtitle?: string
    /** Leading icon shown next to the title. */
    icon?: IconName
    /** Whether the section starts open (default false, to keep the page calm). */
    defaultOpen?: boolean
    children: ReactNode
}

/**
 * A titled section that expands/collapses on tap. Keeps long reference content
 * (guidance, checklists, hotlines) tucked away so the toolkit isn't a wall of
 * text — residents open only what they need.
 */
export function Collapsible({ title, subtitle, icon, defaultOpen = false, children }: Props) {
    const theme = useTheme()
    const [open, setOpen] = useState(defaultOpen)

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setOpen((v) => !v)
    }

    return (
        <View
            style={[
                styles.wrap,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
        >
            <Pressable
                onPress={toggle}
                style={({ pressed }) => [styles.header, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={title}
            >
                {icon ? <Icon name={icon} size={22} color={theme.colors.primary} /> : null}
                <View style={styles.headingText}>
                    <Text variant="subtitle">{title}</Text>
                    {subtitle ? (
                        <Text variant="caption" color="textMuted">
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                <Icon
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.textMuted}
                />
            </Pressable>

            {open ? (
                <View style={[styles.body, { borderTopColor: theme.colors.border }]}>{children}</View>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    wrap: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.lg,
    },
    pressed: { opacity: 0.6 },
    headingText: { flex: 1, gap: 2 },
    body: {
        borderTopWidth: StyleSheet.hairlineWidth,
        padding: spacing.lg,
        gap: spacing.md,
    },
})
