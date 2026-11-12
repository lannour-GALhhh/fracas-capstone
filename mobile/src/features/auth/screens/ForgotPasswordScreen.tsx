import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useBackHandler } from '@/common/hooks/useBackHandler'
import { goBack } from '@/common/utils/navigation'

import { AuthHero } from '../components/AuthHero'
import { CodeStep, DoneStep, PasswordStep, PhoneStep } from '../forgot/components/ForgotSteps'
import { useForgotPassword, type ForgotStep } from '../forgot/useForgotPassword'
import { useAuthColors, type AuthPalette } from '../theme/colors'

const STEP_TITLE: Record<ForgotStep, string> = {
    phone: 'Forgot your password?',
    code: 'Enter the code',
    password: 'Set a new password',
    done: 'All set',
}
const STEP_INDEX: Partial<Record<ForgotStep, number>> = { phone: 1, code: 2, password: 3 }

/** SMS password reset, in one route with an internal step machine (same shell as registration). */
export function ForgotPasswordScreen() {
    const C = useAuthColors()
    const styles = useMemo(() => createStyles(C), [C])
    const f = useForgotPassword()

    useBackHandler(f.back)
    const toLogin = () => goBack('/login')

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
                        {f.step !== 'done' ? (
                            <Pressable
                                onPress={() => (f.back() ? undefined : toLogin())}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Back"
                                style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                            >
                                <Ionicons name="arrow-back" size={22} color={C.text} />
                            </Pressable>
                        ) : null}
                        {STEP_INDEX[f.step] ? (
                            <Text style={styles.stepIndex}>Step {STEP_INDEX[f.step]} of 3</Text>
                        ) : null}
                        <Text style={styles.title}>{STEP_TITLE[f.step]}</Text>
                    </View>

                    {f.step === 'phone' && (
                        <PhoneStep pending={f.pending} error={f.error} onSubmit={f.sendCode} />
                    )}
                    {f.step === 'code' && (
                        <CodeStep
                            phone={f.phone}
                            pending={f.pending}
                            error={f.error}
                            cooldown={f.cooldown}
                            onVerify={f.verify}
                            onResend={f.resend}
                        />
                    )}
                    {f.step === 'password' && (
                        <PasswordStep pending={f.pending} error={f.error} onSubmit={f.setPassword} />
                    )}
                    {f.step === 'done' && <DoneStep onLogin={toLogin} />}
                </SafeAreaView>
            </KeyboardAwareScrollView>
        </View>
    )
}

const createStyles = (C: AuthPalette) =>
    StyleSheet.create({
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
    })
