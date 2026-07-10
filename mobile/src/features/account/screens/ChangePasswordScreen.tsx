import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { useZodForm } from '@/common/hooks/useZodForm'
import { spacing } from '@/common/theme'
import { Button, Field, Screen, Text } from '@/common/ui'
import { apiErrorMessage } from '@/common/utils/apiError'

import { useChangePassword } from '../hooks/useAccountMutations'
import { passwordChangeSchema } from '../schemas'

const EMPTY = { current_password: '', new_password: '', confirm: '' }

/** Change the sign-in password via djoser `set_password`. */
export function ChangePasswordScreen() {
    const change = useChangePassword()
    const [form, setForm] = useState(EMPTY)
    const { fieldError, onBlur, handleSubmit } = useZodForm(passwordChangeSchema, form)

    const set = (key: keyof typeof form) => (value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const onSubmit = handleSubmit((data) => {
        change.mutate(
            { current_password: data.current_password, new_password: data.new_password },
            {
                onSuccess: () => {
                    setForm(EMPTY)
                    Alert.alert('Password updated', 'Your password has been changed.', [
                        { text: 'OK', onPress: () => router.back() },
                    ])
                },
            },
        )
    })

    return (
        <Screen edges={['bottom']}>
            <Button
                label="‹ Back"
                variant="ghost"
                onPress={() => router.back()}
                style={styles.back}
            />
            <Text variant="title" style={styles.title}>
                Change password
            </Text>

            <View style={styles.form}>
                <Field
                    label="Current password"
                    value={form.current_password}
                    onChangeText={set('current_password')}
                    onBlur={onBlur('current_password')}
                    errors={fieldError('current_password')}
                    secureTextEntry
                    autoComplete="current-password"
                />
                <Field
                    label="New password"
                    value={form.new_password}
                    onChangeText={set('new_password')}
                    onBlur={onBlur('new_password')}
                    errors={fieldError('new_password')}
                    secureTextEntry
                    autoComplete="new-password"
                />
                <Field
                    label="Confirm new password"
                    value={form.confirm}
                    onChangeText={set('confirm')}
                    onBlur={onBlur('confirm')}
                    errors={fieldError('confirm')}
                    secureTextEntry
                    autoComplete="new-password"
                />

                {change.isError ? (
                    <Text variant="caption" color="danger">
                        {apiErrorMessage(change.error, "Couldn't change your password.")}
                    </Text>
                ) : null}

                <Button label="Update password" onPress={onSubmit} loading={change.isPending} />
            </View>
        </Screen>
    )
}

const styles = StyleSheet.create({
    back: { alignSelf: 'flex-start', minHeight: 36, paddingHorizontal: 0 },
    title: { marginBottom: spacing.lg },
    form: { gap: spacing.lg },
})
