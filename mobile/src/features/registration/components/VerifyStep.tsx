import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { spacing, useTheme } from '@/common/theme'
import { Button, Checkbox, Field, GradientButton, Text } from '@/common/ui'
import { useZodForm } from '@/common/hooks/useZodForm'

import { LegalModal } from './LegalModal'
import { LEGAL_DOCUMENTS } from '../data/legal'
import { verifySchema } from '../schemas'
import type { LegalDocumentId } from '../types'

interface Props {
    phone: string
    pending: boolean
    error: string | null
    onVerify: (code: string) => void
    onResend: () => void
}

const CODE_PATTERN = /^\d{6}$/

/** Phase 2 — accept both documents + enter the 6-digit OTP. */
export function VerifyStep({ phone, pending, error, onVerify, onResend }: Props) {
    const { colors } = useTheme()
    const [code, setCode] = useState('')
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
    // Which document the reader sheet is showing; `null` = closed.
    const [reading, setReading] = useState<LegalDocumentId | null>(null)
    const form = useZodForm(verifySchema, { code, acceptedTerms, acceptedPrivacy })

    const submit = form.handleSubmit((values) => onVerify(values.code))

    const accepted = { terms: acceptedTerms, privacy: acceptedPrivacy }
    const setAccepted = (id: LegalDocumentId, value: boolean) =>
        (id === 'terms' ? setAcceptedTerms : setAcceptedPrivacy)(value)

    const linkStyle = { color: colors.primary, textDecorationLine: 'underline' as const }

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

            <View style={styles.consent}>
                {(['terms', 'privacy'] as const).map((id) => (
                    <View key={id} style={styles.consentItem}>
                        <Checkbox
                            checked={accepted[id]}
                            onToggle={() => setAccepted(id, !accepted[id])}
                        >
                            {/* The nested Text captures the tap, so opening the
                                document doesn't also toggle the checkbox. */}
                            <Text variant="body">
                                I have read and accept the{' '}
                                <Text
                                    variant="body"
                                    style={linkStyle}
                                    onPress={() => setReading(id)}
                                    accessibilityRole="link"
                                >
                                    {LEGAL_DOCUMENTS[id].title}
                                </Text>
                                .
                            </Text>
                        </Checkbox>
                        {form.fieldError(fieldName[id]) ? (
                            <Text variant="caption" color="danger">
                                {form.fieldError(fieldName[id])![0].message}
                            </Text>
                        ) : null}
                    </View>
                ))}
            </View>

            {error ? (
                <Text variant="caption" color="danger">
                    {error}
                </Text>
            ) : null}

            {/* Gated on the code alone, not `form.isValid`: an unticked box must
                still be able to submit so its error message can surface. */}
            <GradientButton
                label="Verify"
                onPress={submit}
                loading={pending}
                disabled={!CODE_PATTERN.test(code)}
            />
            <Button label="Resend code" variant="ghost" onPress={onResend} disabled={pending} />

            <LegalModal
                document={reading ? LEGAL_DOCUMENTS[reading] : null}
                accepted={reading ? accepted[reading] : false}
                onClose={() => setReading(null)}
                onAccept={() => {
                    if (reading) setAccepted(reading, true)
                    setReading(null)
                }}
            />
        </View>
    )
}

/** Checkbox id → the schema field its error message lives under. */
const fieldName: Record<LegalDocumentId, string> = {
    terms: 'acceptedTerms',
    privacy: 'acceptedPrivacy',
}

const styles = StyleSheet.create({
    container: { gap: spacing.lg },
    consent: { gap: spacing.md },
    consentItem: { gap: spacing.xs },
})
