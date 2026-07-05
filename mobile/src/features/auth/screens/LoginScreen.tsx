import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Field, Screen, Text } from '@/common/ui'
import { useZodForm } from '@/common/hooks/useZodForm'
import { normalizePhone } from '@/common/utils/phone'

import { useAuth } from '../context/useAuth'
import { loginSchema } from '../schemas/loginSchema'

export function LoginScreen() {
    const router = useRouter()
    const { login } = useAuth()
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const form = useZodForm(loginSchema, { phone, password })

    const onSubmit = form.handleSubmit(async (values) => {
        setSubmitting(true)
        setFormError(null)
        try {
            await login({ username: normalizePhone(values.phone)!, password: values.password })
            // Auth state flips → the (auth) layout guard redirects into the app.
        } catch {
            setFormError('Incorrect phone number or password.')
        } finally {
            setSubmitting(false)
        }
    })

    return (
        <Screen>
            <View style={styles.header}>
                <Text variant="title">Welcome back</Text>
                <Text variant="body" color="textMuted">
                    Sign in with your registered phone number.
                </Text>
            </View>

            <View style={styles.form}>
                <Field
                    label="Phone number"
                    placeholder="09XX XXX XXXX"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    value={phone}
                    onChangeText={setPhone}
                    onBlur={form.onBlur('phone')}
                    errors={form.fieldError('phone')}
                />
                <Field
                    label="Password"
                    placeholder="Your password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onBlur={form.onBlur('password')}
                    errors={form.fieldError('password')}
                />

                {formError ? (
                    <Text variant="caption" color="danger">
                        {formError}
                    </Text>
                ) : null}

                <Button label="Sign in" onPress={onSubmit} loading={submitting} />
            </View>

            <View style={styles.footer}>
                <Text variant="body" color="textMuted">
                    New to FRACAS?
                </Text>
                <Button
                    label="Create an account"
                    variant="ghost"
                    onPress={() => router.push('/register')}
                />
            </View>
        </Screen>
    )
}

const styles = StyleSheet.create({
    header: { gap: spacing.xs, marginBottom: spacing.xl },
    form: { gap: spacing.lg },
    footer: { marginTop: spacing.xxl, gap: spacing.sm, alignItems: 'center' },
})
