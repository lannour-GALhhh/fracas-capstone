import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useZodForm } from '@/common/hooks/useZodForm'
import { passwordSchema, phoneSchema } from '@/features/registration/schemas'

import { AuthButton, AuthLinkButton } from '../../components/AuthButton'
import { AuthField } from '../../components/AuthField'
import { useAuthColors, type AuthPalette } from '../../theme/colors'

interface StepProps {
    pending: boolean
    error: string | null
}

function useStepStyles() {
    const C = useAuthColors()
    return { C, styles: useMemo(() => createStyles(C), [C]) }
}

export function PhoneStep({
    pending,
    error,
    onSubmit,
}: StepProps & { onSubmit: (phone: string) => void }) {
    const { styles } = useStepStyles()
    const [phone, setPhone] = useState('')
    const form = useZodForm(phoneSchema, { phone })
    const submit = form.handleSubmit((v) => onSubmit(v.phone))

    return (
        <View style={styles.container}>
            <Text style={styles.intro}>
                Enter the mobile number on your account and we&apos;ll text you a 6-digit code.
            </Text>
            <AuthField
                label="Phone number"
                placeholder="09XX XXX XXXX"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={setPhone}
                onBlur={form.onBlur('phone')}
                error={form.fieldError('phone')?.[0]?.message}
                icon="call-outline"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <AuthButton
                label="Send Code"
                onPress={submit}
                loading={pending}
                disabled={!form.isValid}
            />
        </View>
    )
}

export function CodeStep({
    phone,
    pending,
    error,
    cooldown,
    onVerify,
    onResend,
}: StepProps & {
    phone: string
    cooldown: number
    onVerify: (code: string) => void
    onResend: () => void
}) {
    const { styles } = useStepStyles()
    const [code, setCode] = useState('')
    const valid = /^\d{6}$/.test(code)

    return (
        <View style={styles.container}>
            <Text style={styles.intro}>
                If {phone} belongs to an account, we sent it a 6-digit code.
            </Text>
            <AuthField
                label="Verification code"
                placeholder="000000"
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                icon="shield-checkmark-outline"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <AuthButton
                label="Verify"
                onPress={() => onVerify(code)}
                loading={pending}
                disabled={!valid}
            />
            <AuthLinkButton
                label={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                onPress={onResend}
                disabled={pending || cooldown > 0}
            />
        </View>
    )
}

export function PasswordStep({
    pending,
    error,
    onSubmit,
}: StepProps & { onSubmit: (password: string) => void }) {
    const { C, styles } = useStepStyles()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [show, setShow] = useState(false)
    const form = useZodForm(passwordSchema, { password, confirm })
    const submit = form.handleSubmit((v) => onSubmit(v.password))

    const eye = (
        <Pressable hitSlop={8} onPress={() => setShow((v) => !v)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
        </Pressable>
    )

    return (
        <View style={styles.container}>
            <Text style={styles.intro}>Code accepted. Choose a new password for your account.</Text>
            <AuthField
                label="New password"
                placeholder="At least 6 characters"
                secureTextEntry={!show}
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                onBlur={form.onBlur('password')}
                error={form.fieldError('password')?.[0]?.message}
                icon="lock-closed-outline"
                accessory={eye}
            />
            <AuthField
                label="Confirm new password"
                placeholder="Re-enter your password"
                secureTextEntry={!show}
                textContentType="newPassword"
                value={confirm}
                onChangeText={setConfirm}
                onBlur={form.onBlur('confirm')}
                error={form.fieldError('confirm')?.[0]?.message}
                icon="lock-closed-outline"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <AuthButton label="Reset Password" onPress={submit} loading={pending} />
        </View>
    )
}

export function DoneStep({ onLogin }: { onLogin: () => void }) {
    const { C, styles } = useStepStyles()
    return (
        <View style={[styles.container, styles.center]}>
            <Ionicons name="checkmark-circle" size={72} color={C.primary} />
            <Text style={styles.intro}>
                Your password has been updated. Log in with your new password.
            </Text>
            <AuthButton label="Back to Log In" onPress={onLogin} />
        </View>
    )
}

const createStyles = (C: AuthPalette) =>
    StyleSheet.create({
        container: { gap: 18 },
        center: { alignItems: 'stretch' },
        intro: { color: C.muted, fontSize: 15, lineHeight: 21 },
        error: { color: C.danger, fontSize: 14, textAlign: 'center' },
    })
