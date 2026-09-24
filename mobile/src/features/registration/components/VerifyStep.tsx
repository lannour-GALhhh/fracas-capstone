import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { AuthButton, AuthLinkButton } from '@/features/auth/components/AuthButton'
import { AuthField } from '@/features/auth/components/AuthField'
import { authColors as C } from '@/features/auth/theme/colors'
import { Checkbox } from '@/common/ui'
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

    return (
        <View style={styles.container}>
            <Text style={styles.intro}>We sent a 6-digit code to {phone}.</Text>

            <AuthField
                label="Verification code"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                onBlur={form.onBlur('code')}
                error={form.fieldError('code')?.[0]?.message}
                icon="shield-checkmark-outline"
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
                            <Text style={styles.consentText}>
                                I have read and accept the{' '}
                                <Text
                                    style={styles.consentLink}
                                    onPress={() => setReading(id)}
                                    accessibilityRole="link"
                                >
                                    {LEGAL_DOCUMENTS[id].title}
                                </Text>
                                .
                            </Text>
                        </Checkbox>
                        {form.fieldError(fieldName[id]) ? (
                            <Text style={styles.error}>
                                {form.fieldError(fieldName[id])![0].message}
                            </Text>
                        ) : null}
                    </View>
                ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Gated on the code alone, not `form.isValid`: an unticked box must
                still be able to submit so its error message can surface. */}
            <AuthButton
                label="Verify"
                onPress={submit}
                loading={pending}
                disabled={!CODE_PATTERN.test(code)}
            />
            <AuthLinkButton label="Resend code" onPress={onResend} disabled={pending} />

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
    container: { gap: 18 },
    intro: { color: C.muted, fontSize: 15, lineHeight: 21 },
    consent: { gap: 12 },
    consentItem: { gap: 4 },
    consentText: { color: C.text, fontSize: 15, lineHeight: 21 },
    consentLink: { color: C.primary, textDecorationLine: 'underline' },
    error: { color: C.danger, fontSize: 13, textAlign: 'center' },
})
