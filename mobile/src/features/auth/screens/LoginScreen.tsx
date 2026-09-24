import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useZodForm } from '@/common/hooks/useZodForm'
import { normalizePhone } from '@/common/utils/phone'

import { AuthField } from '../components/AuthField'
import { AuthHero } from '../components/AuthHero'
import { useAuth } from '../context/useAuth'
import { loginSchema } from '../schemas/loginSchema'
import { authColors as C } from '../theme/colors'

export function LoginScreen() {
    const router = useRouter()
    const { login } = useAuth()

    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const form = useZodForm(loginSchema, { phone, password })

    const onSubmit = form.handleSubmit(async (values) => {
        setSubmitting(true)
        setFormError(null)
        try {
            await login({ username: normalizePhone(values.phone)!, password: values.password })
        } catch {
            setFormError('Incorrect phone number or password.')
        } finally {
            setSubmitting(false)
        }
    })

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
                <AuthHero heightRatio={0.4} />

                {/* Sheet — the form */}
                <SafeAreaView edges={['bottom']} style={styles.sheet}>
                    <Text style={styles.title}>Welcome back</Text>

                    <View style={styles.form}>
                        <AuthField
                            label="Phone number"
                            placeholder="Phone Number"
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            textContentType="telephoneNumber"
                            value={phone}
                            onChangeText={setPhone}
                            onBlur={form.onBlur('phone')}
                            error={form.fieldError('phone')?.[0]?.message}
                            icon="call-outline"
                        />

                        <AuthField
                            label="Password"
                            placeholder="Password"
                            secureTextEntry={!showPassword}
                            autoComplete="password"
                            textContentType="password"
                            value={password}
                            onChangeText={setPassword}
                            onBlur={form.onBlur('password')}
                            error={form.fieldError('password')?.[0]?.message}
                            icon="lock-closed-outline"
                            accessory={
                                <Pressable
                                    hitSlop={8}
                                    onPress={() => setShowPassword((v) => !v)}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color={C.muted}
                                    />
                                </Pressable>
                            }
                        />

                        <Pressable hitSlop={8} style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}>Forgot my password</Text>
                        </Pressable>

                        {formError ? (
                            <Text style={styles.formError}>{formError}</Text>
                        ) : null}

                        <Pressable
                            onPress={onSubmit}
                            disabled={submitting}
                            style={({ pressed }) => [
                                styles.submit,
                                (pressed || submitting) && styles.submitDim,
                            ]}
                        >
                            <Text style={styles.submitText}>
                                {submitting ? 'Logging in...' : 'Log In to Fracas'}
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>New to FRACAS?</Text>
                        <Pressable hitSlop={8} onPress={() => router.push('/register')}>
                            <Text style={styles.footerLink}>Create an account</Text>
                        </Pressable>
                    </View>
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
        marginTop: -36,
        borderTopLeftRadius: 44,
        borderTopRightRadius: 44,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 16,
    },

    title: { color: C.text, fontSize: 26, fontWeight: '700', textAlign: 'center' },

    form: { marginTop: 24, gap: 18 },

    forgotPassword: { alignSelf: 'flex-end', marginTop: -8 },
    forgotPasswordText: { color: C.primary, fontSize: 14, fontWeight: '600' },

    formError: { color: C.danger, fontSize: 14, textAlign: 'center' },

    submit: {
        minHeight: 56,
        borderRadius: 28,
        backgroundColor: C.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        shadowColor: C.primary,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    submitDim: { opacity: 0.65 },
    submitText: { color: C.onPrimary, fontSize: 18, fontWeight: '700' },

    footer: {
        paddingTop: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    footerText: { color: C.muted, fontSize: 15 },
    footerLink: { color: C.primary, fontSize: 15, fontWeight: '700' },
})
