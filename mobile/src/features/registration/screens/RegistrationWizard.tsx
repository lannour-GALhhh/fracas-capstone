import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Screen, Text } from '@/common/ui'

import { PasswordStep } from '../components/PasswordStep'
import { PhoneStep } from '../components/PhoneStep'
import { VerifyStep } from '../components/VerifyStep'
import { useRegistration } from '../hooks/useRegistration'
import type { RegistrationStep } from '../types'

const STEP_INDEX: Record<RegistrationStep, number> = { phone: 1, verify: 2, password: 3 }
const STEP_TITLE: Record<RegistrationStep, string> = {
    phone: 'Create your account',
    verify: 'Verify your number',
    password: 'Set a password',
}

/** The 3-phase registration flow, held in one route with an internal state machine. */
export function RegistrationWizard() {
    const router = useRouter()
    const { step, phone, pending, error, start, resend, verify, setPassword } = useRegistration()

    return (
        <Screen>
            <View style={styles.header}>
                <Text variant="caption" color="textMuted">
                    Step {STEP_INDEX[step]} of 3
                </Text>
                <Text variant="title">{STEP_TITLE[step]}</Text>
            </View>

            {step === 'phone' && <PhoneStep pending={pending} error={error} onSubmit={start} />}
            {step === 'verify' && (
                <VerifyStep
                    phone={phone}
                    pending={pending}
                    error={error}
                    onVerify={verify}
                    onResend={resend}
                />
            )}
            {step === 'password' && (
                <PasswordStep pending={pending} error={error} onSubmit={setPassword} />
            )}

            {step === 'phone' ? (
                <View style={styles.footer}>
                    <Button
                        label="I already have an account"
                        variant="ghost"
                        onPress={() => router.replace('/login')}
                    />
                </View>
            ) : null}
        </Screen>
    )
}

const styles = StyleSheet.create({
    header: { gap: spacing.xs, marginBottom: spacing.xl },
    footer: { marginTop: spacing.xxl, alignItems: 'center' },
})
