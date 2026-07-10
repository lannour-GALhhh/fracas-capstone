import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
    type TextInputProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useZodForm } from '@/common/hooks/useZodForm'
import { normalizePhone } from '@/common/utils/phone'

import { useAuth } from '../context/useAuth'
import { loginSchema } from '../schemas/loginSchema'

/**
 * Bespoke, light-mode login built for mobile: a branded hero fills the top half,
 * a rounded white sheet carries the phone + password form on the bottom half.
 * Colors are hardcoded light (not theme-driven) so the sign-in surface reads the
 * same regardless of the device's dark/light setting.
 */
const C = {
    hero: '#208AEF',
    heroDeep: '#0F63C4',
    sheet: '#ffffff',
    text: '#0F1622',
    muted: '#6B7280',
    border: '#E3E8EF',
    inputBg: '#F4F7FB',
    primary: '#208AEF',
    onPrimary: '#ffffff',
    danger: '#D14343',
    onHero: '#EAF3FF',
}

export function LoginScreen() {
    const router = useRouter()
    const { login } = useAuth()
    const { height } = useWindowDimensions()

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
            // Auth state flips → the (auth) layout guard redirects into the app.
        } catch {
            setFormError('Incorrect phone number or password.')
        } finally {
            setSubmitting(false)
        }
    })

    // Hero takes ~46% of the screen; the sheet overlaps it by 28px for the curve.
    const heroHeight = Math.round(height * 0.46)

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Hero — placeholder image + brand mark */}
                    <View style={[styles.hero, { height: heroHeight }]}>
                        <Image
                            source={require('../../../../assets/images/logo-glow.png')}
                            style={styles.heroImage}
                            contentFit="contain"
                            transition={300}
                        />
                        <SafeAreaView edges={['top']} style={styles.heroContent}>
                            <View style={styles.heroBadge}>
                                <Text style={styles.heroBadgeText}>Flood Early-Warning</Text>
                            </View>
                            <Text style={styles.heroTitle}>FRACAS</Text>
                            <Text style={styles.heroSubtitle}>
                                Real-time flood risk for your barangay
                            </Text>
                        </SafeAreaView>
                    </View>

                    {/* Sheet — the form */}
                    <SafeAreaView edges={['bottom']} style={styles.sheet}>
                        <View style={styles.grabber} />

                        <Text style={styles.title}>Welcome back</Text>
                        <Text style={styles.subtitle}>
                            Sign in with your registered phone number.
                        </Text>

                        <View style={styles.form}>
                            <LoginField
                                label="Phone number"
                                placeholder="09XX XXX XXXX"
                                keyboardType="phone-pad"
                                autoComplete="tel"
                                textContentType="telephoneNumber"
                                value={phone}
                                onChangeText={setPhone}
                                onBlur={form.onBlur('phone')}
                                error={form.fieldError('phone')?.[0]?.message}
                            />

                            <LoginField
                                label="Password"
                                placeholder="Your password"
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                                textContentType="password"
                                value={password}
                                onChangeText={setPassword}
                                onBlur={form.onBlur('password')}
                                error={form.fieldError('password')?.[0]?.message}
                                accessory={
                                    <Pressable
                                        hitSlop={8}
                                        onPress={() => setShowPassword((v) => !v)}
                                    >
                                        <Text style={styles.accessoryText}>
                                            {showPassword ? 'Hide' : 'Show'}
                                        </Text>
                                    </Pressable>
                                }
                            />

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
                                    {submitting ? 'Signing in…' : 'Sign in'}
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
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}

interface FieldProps extends TextInputProps {
    label: string
    error?: string
    accessory?: React.ReactNode
}

/** Light-mode labeled input with an optional right-side accessory (e.g. show/hide). */
function LoginField({ label, error, accessory, style, ...inputProps }: FieldProps) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={C.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    {...inputProps}
                />
                {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
            </View>
            {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        </View>
    )
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.sheet },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, backgroundColor: C.hero },

    hero: {
        backgroundColor: C.hero,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroImage: {
        position: 'absolute',
        width: '78%',
        height: '78%',
        opacity: 0.9,
    },
    heroContent: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    heroBadge: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 14,
    },
    heroBadgeText: {
        color: C.onHero,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    heroTitle: {
        color: '#ffffff',
        fontSize: 40,
        fontWeight: '800',
        letterSpacing: 1,
    },
    heroSubtitle: {
        color: C.onHero,
        fontSize: 14,
        marginTop: 4,
        textAlign: 'center',
    },

    sheet: {
        flexGrow: 1,
        backgroundColor: C.sheet,
        marginTop: -28,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 16,
    },
    grabber: {
        alignSelf: 'center',
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: C.border,
        marginBottom: 20,
    },

    title: { color: C.text, fontSize: 24, fontWeight: '700' },
    subtitle: { color: C.muted, fontSize: 14, marginTop: 4 },

    form: { marginTop: 24, gap: 16 },

    field: { gap: 7 },
    label: { color: C.text, fontSize: 13, fontWeight: '600' },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.inputBg,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 14,
    },
    inputWrapError: { borderColor: C.danger },
    input: {
        flex: 1,
        minHeight: 52,
        fontSize: 16,
        color: C.text,
    },
    accessory: { paddingLeft: 10 },
    accessoryText: { color: C.primary, fontSize: 13, fontWeight: '600' },
    fieldError: { color: C.danger, fontSize: 12 },

    formError: { color: C.danger, fontSize: 13, textAlign: 'center' },

    submit: {
        minHeight: 54,
        borderRadius: 14,
        backgroundColor: C.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        shadowColor: C.primary,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    submitDim: { opacity: 0.65 },
    submitText: { color: C.onPrimary, fontSize: 16, fontWeight: '700' },

    footer: {
        marginTop: 'auto',
        paddingTop: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    footerText: { color: C.muted, fontSize: 14 },
    footerLink: { color: C.primary, fontSize: 14, fontWeight: '700' },
})
