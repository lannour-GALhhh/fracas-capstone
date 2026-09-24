import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
    type TextInputProps,
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useZodForm } from '@/common/hooks/useZodForm'
import { normalizePhone } from '@/common/utils/phone'

import { useAuth } from '../context/useAuth'
import { loginSchema } from '../schemas/loginSchema'

/** Sparse decorative "rain" strokes scattered across the hero — minimal lines, not drop shapes. */
const RAINDROPS: Array<{
    top: `${number}%`
    left: `${number}%`
    height: number
    rotate: string
    opacity: number
}> = [
    { top: '18%', left: '14%', height: 16, rotate: '12deg', opacity: 0.3 },
    { top: '30%', left: '84%', height: 20, rotate: '10deg', opacity: 0.22 },
    { top: '64%', left: '22%', height: 14, rotate: '15deg', opacity: 0.18 },
    { top: '72%', left: '70%', height: 18, rotate: '8deg', opacity: 0.25 },
    { top: '48%', left: '50%', height: 12, rotate: '14deg', opacity: 0.15 },
]


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
        } catch {
            setFormError('Incorrect phone number or password.')
        } finally {
            setSubmitting(false)
        }
    })

    const heroHeight = Math.round(height * 0.4)

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
                <View style={[styles.hero, { height: heroHeight }]}>
                    <View style={styles.heroCircleTopRight} pointerEvents="none" />
                    <View style={styles.heroCircleBottom} pointerEvents="none" />
                    {RAINDROPS.map((drop, i) => (
                        <View
                            key={i}
                            pointerEvents="none"
                            style={[
                                styles.raindrop,
                                {
                                    top: drop.top,
                                    left: drop.left,
                                    height: drop.height,
                                    opacity: drop.opacity,
                                    transform: [{ rotate: drop.rotate }],
                                },
                            ]}
                        />
                    ))}
                    <Image
                        source={require('../../../../assets/images/logo-glow.png')}
                        style={styles.heroImage}
                        contentFit="contain"
                        transition={300}
                    />
                    <SafeAreaView edges={['top']} style={styles.heroContent}>
                        <Text style={styles.heroTitle}>FRACAS</Text>
                    </SafeAreaView>
                </View>

                {/* Sheet — the form */}
                <SafeAreaView edges={['bottom']} style={styles.sheet}>
                    <Text style={styles.title}>Welcome back</Text>

                    <View style={styles.form}>
                        <LoginField
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

                        <LoginField
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

interface FieldProps extends TextInputProps {
    label: string
    error?: string
    icon: keyof typeof Ionicons.glyphMap
    accessory?: React.ReactNode
}

function LoginField({ label, error, icon, accessory, style, ...inputProps }: FieldProps) {
    return (
        <View style={styles.field}>
            <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
                <Ionicons name={icon} size={20} color={C.muted} style={styles.inputIcon} />
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={C.muted}
                    accessibilityLabel={label}
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
    heroCircleTopRight: {
        position: 'absolute',
        top: -55,
        right: -55,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroCircleBottom: {
        position: 'absolute',
        bottom: -95,
        left: -55,
        width: 230,
        height: 230,
        borderRadius: 115,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    raindrop: {
        position: 'absolute',
        width: 2,
        borderRadius: 1,
        backgroundColor: '#ffffff',
    },
    heroContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    heroTitle: {
        color: '#ffffff',
        fontSize: 40,
        fontWeight: '800',
        letterSpacing: 1,
    },

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
    grabber: {
        alignSelf: 'center',
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: C.border,
        marginBottom: 20,
    },

    title: { color: C.text, fontSize: 26, fontWeight: '700', textAlign: 'center' },

    form: { marginTop: 24, gap: 18 },

    field: { gap: 8 },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.inputBg,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'transparent',
        paddingHorizontal: 18,
    },
    inputWrapError: { borderColor: C.danger },
    inputIcon: { marginRight: 10 },
    input: {
        flex: 1,
        minHeight: 56,
        fontSize: 18,
        color: C.text,
    },
    accessory: { paddingLeft: 10 },
    fieldError: { color: C.danger, fontSize: 13 },

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
