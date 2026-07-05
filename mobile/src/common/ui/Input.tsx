import { forwardRef } from 'react'
import { StyleSheet, TextInput, type TextInputProps } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'

interface Props extends TextInputProps {
    invalid?: boolean
}

/** Themed single-line text input with an error (invalid) border state. */
export const Input = forwardRef<TextInput, Props>(function Input(
    { invalid = false, style, ...rest },
    ref,
) {
    const theme = useTheme()
    return (
        <TextInput
            ref={ref}
            placeholderTextColor={theme.colors.textMuted}
            style={[
                styles.base,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: invalid ? theme.colors.danger : theme.colors.border,
                    color: theme.colors.text,
                },
                style,
            ]}
            {...rest}
        />
    )
})

const styles = StyleSheet.create({
    base: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        fontSize: 15,
    },
})
