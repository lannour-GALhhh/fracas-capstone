import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Checkbox, Field, Text } from '@/common/ui'
import { useZodForm } from '@/common/hooks/useZodForm'

import { verifySchema } from '../schemas'

interface Props {
    phone: string
    pending: boolean
    error: string | null
    onVerify: (code: string) => void
    onResend: () => void
}

/** Phase 2 — accept terms + enter the 6-digit OTP. */
export function VerifyStep({ phone, pending, error, onVerify, onResend }: Props) {
    const [code, setCode] = useState('')
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const form = useZodForm(verifySchema, { code, acceptedTerms })

    const submit = form.handleSubmit((values) => onVerify(values.code))

    return (
        <View style={styles.container}>
            <Text variant="body" color="textMuted">
                We sent a 6-digit code to {phone}.
            </Text>

            <Field
                label="Verification code"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                onBlur={form.onBlur('code')}
                errors={form.fieldError('code')}
            />

            <View style={styles.terms}>
                <Checkbox checked={acceptedTerms} onToggle={() => setAcceptedTerms((v) => !v)}>
                    <Text variant="body">
                        I accept the Privacy Policy and Terms of Use.
                    </Text>
                </Checkbox>
                {form.fieldError('acceptedTerms') ? (
                    <Text variant="caption" color="danger">
                        {form.fieldError('acceptedTerms')![0].message}
                    </Text>
                ) : null}
            </View>

            {error ? (
                <Text variant="caption" color="danger">
                    {error}
                </Text>
            ) : null}

            <Button label="Verify" onPress={submit} loading={pending} />
            <Button label="Resend code" variant="ghost" onPress={onResend} disabled={pending} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { gap: spacing.lg },
    terms: { gap: spacing.xs },
})
