import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { useZodForm } from '@/common/hooks/useZodForm'
import { spacing } from '@/common/theme'
import { Button, Field, Screen, Text } from '@/common/ui'
import { apiErrorMessage } from '@/common/utils/apiError'
import { goBack } from '@/common/utils/navigation'

import { ConfirmChangesModal } from '../components/ConfirmChangesModal'
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

    const [confirming, setConfirming] = useState(false)
    const hasChanges = Boolean(form.current_password || form.new_password || form.confirm)

    const onSubmit = handleSubmit(() => setConfirming(true))

    const doChange = () => {
        change.mutate(
            { current_password: form.current_password, new_password: form.new_password },
            {
                onError: () => setConfirming(false),
                onSuccess: () => {
                    setConfirming(false)
                    setForm(EMPTY)
                    Alert.alert('Password updated', 'Your password has been changed.', [
                        { text: 'OK', onPress: () => goBack() },
                    ])
                },
            },
        )
    }

    return (
        <Screen edges={['bottom']}>

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

                <Button
                    label="Update password"
                    icon="lock-closed-outline"
                    size="lg"
                    onPress={onSubmit}
                    disabled={!hasChanges}
                    loading={change.isPending}
                />

                <ConfirmChangesModal
                    visible={confirming}
                    title="Change your password?"
                    message="You'll use the new password the next time you sign in."
                    icon="lock-closed"
                    confirmLabel="Confirm"
                    loading={change.isPending}
                    onCancel={() => setConfirming(false)}
                    onConfirm={doChange}
                />
            </View>
        </Screen>
    )
}

const styles = StyleSheet.create({
    form: { gap: spacing.lg },
})
