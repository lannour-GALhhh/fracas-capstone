import { Pressable, StyleSheet, View } from 'react-native'

import { useBackHandler } from '@/common/hooks/useBackHandler'
import { spacing, useTheme } from '@/common/theme'
import { Button, Icon, Screen, Text } from '@/common/ui'
import { goBack } from '@/common/utils/navigation'

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

/**
 * The 3-phase registration flow, held in one route with an internal state
 * machine. Because the steps are not routes, back is wired to the machine: a
 * press unwinds one step and only leaves for the login screen once there is no
 * earlier step to return to.
 */
export function RegistrationWizard() {
    const theme = useTheme()
    const { step, phone, pending, error, start, resend, verify, setPassword, back } =
        useRegistration()

    useBackHandler(back)

    return (
        <Screen>
            <View style={styles.header}>
                {step === 'verify' ? (
                    <Pressable
                        onPress={back}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Back to your number"
                        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                    >
                        <Icon name="arrow-back" size={24} color={theme.colors.text} />
                    </Pressable>
                ) : null}
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
                        onPress={() => goBack('/login')}
                    />
                </View>
            ) : null}
        </Screen>
    )
}

const styles = StyleSheet.create({
    header: { gap: spacing.xs, marginBottom: spacing.xl },
    back: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginBottom: spacing.xs },
    pressed: { opacity: 0.5 },
    footer: { marginTop: spacing.xxl, alignItems: 'center' },
})
