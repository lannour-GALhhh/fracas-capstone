import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { AuthButton } from '@/features/auth/components/AuthButton'
import { AuthField } from '@/features/auth/components/AuthField'
import { authColors as C } from '@/features/auth/theme/colors'
import { useZodForm } from '@/common/hooks/useZodForm'

import { AddressPicker } from './AddressPicker'
import { phoneSchema } from '../schemas'
import type { RegistrationAddress } from '../types'

interface Props {
    pending: boolean
    error: string | null
    onSubmit: (phone: string, address: RegistrationAddress) => void
}

/** Phase 1 — phone number + permanent address (via location service). */
export function PhoneStep({ pending, error, onSubmit }: Props) {
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState<RegistrationAddress>({})
    const form = useZodForm(phoneSchema, { phone })

    // Address is optional at this phase (backend accepts an empty one and it can
    // be set later in the profile), but strongly encouraged via the picker.
    const submit = form.handleSubmit((values) => onSubmit(values.phone, address))

    return (
        <View style={styles.container}>
            <Text style={styles.intro}>
                Your phone number is your login and where flood alerts are sent.
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

            <AddressPicker
                value={address}
                onChange={setAddress}
                disabled={pending}
                style={styles.addressCard}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Gated on a valid number: the OTP send is a real SMS, so don't let
                a half-typed number spend one. */}
            <AuthButton
                label="Send Verification Code"
                onPress={submit}
                loading={pending}
                disabled={!form.isValid}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { gap: 18 },
    intro: { color: C.muted, fontSize: 15, lineHeight: 21 },
    error: { color: C.danger, fontSize: 14, textAlign: 'center' },
    // Softens the shared `Card` to sit inside the borderless auth sheet.
    addressCard: { backgroundColor: C.inputBg, borderColor: 'transparent', borderRadius: 20 },
})
