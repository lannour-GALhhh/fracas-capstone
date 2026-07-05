import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Field, Text } from '@/common/ui'
import { useZodForm } from '@/common/hooks/useZodForm'

import { passwordSchema } from '../schemas'

interface Props {
    pending: boolean
    error: string | null
    onSubmit: (password: string) => void
}

/** Phase 3 — set a password (min 6 chars) and finish. */
export function PasswordStep({ pending, error, onSubmit }: Props) {
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const form = useZodForm(passwordSchema, { password, confirm })

    const submit = form.handleSubmit((values) => onSubmit(values.password))

    return (
        <View style={styles.container}>
            <Text variant="body" color="textMuted">
                Choose a password to finish setting up your account.
            </Text>

            <Field
                label="Password"
                placeholder="At least 6 characters"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onBlur={form.onBlur('password')}
                errors={form.fieldError('password')}
            />
            <Field
                label="Confirm password"
                placeholder="Re-enter your password"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
                onBlur={form.onBlur('confirm')}
                errors={form.fieldError('confirm')}
            />

            {error ? (
                <Text variant="caption" color="danger">
                    {error}
                </Text>
            ) : null}

            <Button label="Create account" onPress={submit} loading={pending} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { gap: spacing.lg },
})
