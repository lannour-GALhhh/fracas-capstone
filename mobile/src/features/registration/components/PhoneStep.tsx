import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Field, Text } from '@/common/ui'
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
            <Text variant="body" color="textMuted">
                Your phone number is your login and where flood alerts are sent.
            </Text>

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

            <AddressPicker value={address} onChange={setAddress} disabled={pending} />

            {error ? (
                <Text variant="caption" color="danger">
                    {error}
                </Text>
            ) : null}

            <Button label="Send code" onPress={submit} loading={pending} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { gap: spacing.lg },
})
