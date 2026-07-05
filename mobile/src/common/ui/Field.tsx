import { StyleSheet, View, type TextInputProps } from 'react-native'

import { spacing } from '@/common/theme'

import { Input } from './Input'
import { Text } from './Text'

/** Error shape produced by `useZodForm().fieldError(name)`. */
type FieldErrors = { message: string }[]

interface Props extends TextInputProps {
    label: string
    errors?: FieldErrors
    hint?: string
}

/** Labeled input row: label + Input + first error (or hint). Consumes `useZodForm`. */
export function Field({ label, errors, hint, ...inputProps }: Props) {
    const invalid = !!errors?.length
    return (
        <View style={styles.row}>
            <Text variant="label">{label}</Text>
            <Input invalid={invalid} {...inputProps} />
            {invalid ? (
                <Text variant="caption" color="danger">
                    {errors[0].message}
                </Text>
            ) : hint ? (
                <Text variant="caption" color="textMuted">
                    {hint}
                </Text>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    row: { gap: spacing.xs },
})
