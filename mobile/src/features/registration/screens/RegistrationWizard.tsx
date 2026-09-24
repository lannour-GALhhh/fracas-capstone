import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuthHero } from '@/features/auth/components/AuthHero'
import { authColors as C } from '@/features/auth/theme/colors'
import { useBackHandler } from '@/common/hooks/useBackHandler'
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
 *
 * Shares the hero + rounded-sheet shell with `LoginScreen` so the two auth
 * entry points read as one flow rather than two different apps.
 */
export function RegistrationWizard() {
    const { step, phone, pending, error, start, resend, verify, setPassword, back } =
        useRegistration()

    useBackHandler(back)

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            <KeyboardAwareScrollView
                style={styles.flex}
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
                bottomOffset={32}
            >
                <AuthHero heightRatio={0.22} />

                <SafeAreaView edges={['bottom']} style={styles.sheet}>
                    <View style={styles.header}>
                        {step === 'verify' ? (
                            <Pressable
                                onPress={back}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Back to your number"
                                style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                            >
                                <Ionicons name="arrow-back" size={22} color={C.text} />
                            </Pressable>
                        ) : null}
                        <Text style={styles.stepIndex}>Step {STEP_INDEX[step]} of 3</Text>
                        <Text style={styles.title}>{STEP_TITLE[step]}</Text>
                    </View>

                    {step === 'phone' && (
                        <PhoneStep pending={pending} error={error} onSubmit={start} />
                    )}
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
                            <Text style={styles.footerText}>Already have an account?</Text>
                            <Pressable hitSlop={8} onPress={() => goBack('/login')}>
                                <Text style={styles.footerLink}>Log in</Text>
                            </Pressable>
                        </View>
                    ) : null}
                </SafeAreaView>
            </KeyboardAwareScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.sheet },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, backgroundColor: C.hero },

    sheet: {
        flexGrow: 1,
        backgroundColor: C.sheet,
        marginTop: -28,
        borderTopLeftRadius: 44,
        borderTopRightRadius: 44,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 16,
    },

    header: { gap: 4, marginBottom: 24 },
    back: { alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 4 },
    pressed: { opacity: 0.5 },
    stepIndex: { color: C.muted, fontSize: 13, fontWeight: '600' },
    title: { color: C.text, fontSize: 24, fontWeight: '700' },

    // Pins the footer to the bottom of the (flex-grown) sheet, keeping it clear
    // of the primary call-to-action above it.
    footer: {
        marginTop: 'auto',
        paddingTop: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    footerText: { color: C.muted, fontSize: 15 },
    footerLink: { color: C.primary, fontSize: 15, fontWeight: '700' },
})
