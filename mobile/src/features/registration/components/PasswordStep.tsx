import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { AuthButton } from '@/features/auth/components/AuthButton'
import { AuthField } from '@/features/auth/components/AuthField'
import { authColors as C } from '@/features/auth/theme/colors'
import { useZodForm } from '@/common/hooks/useZodForm'

import { passwordSchema } from '../schemas'

interface Props {
    pending: boolean
    error: string | null
    onSubmit: (password: string) => void
}

/** Phase 3 — set a password (min 6 chars) and finish. */
export function PasswordStep({ pending, error, onSubmit }: Props) {
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const form = useZodForm(passwordSchema, { password, confirm })

    const submit = form.handleSubmit((values) => onSubmit(values.password))

    return (
        <View style={styles.container}>
            <Text style={styles.intro}>Choose a password to finish setting up your account.</Text>

            <AuthField
                label="Password"
                placeholder="At least 6 characters"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onBlur={form.onBlur('password')}
                error={form.fieldError('password')?.[0]?.message}
                icon="lock-closed-outline"
                accessory={
                    <Pressable hitSlop={8} onPress={() => setShowPassword((v) => !v)}>
                        <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={C.muted}
                        />
                    </Pressable>
                }
            />
            <AuthField
                label="Confirm password"
                placeholder="Re-enter your password"
                secureTextEntry={!showConfirm}
                value={confirm}
                onChangeText={setConfirm}
                onBlur={form.onBlur('confirm')}
                error={form.fieldError('confirm')?.[0]?.message}
                icon="lock-closed-outline"
                accessory={
                    <Pressable hitSlop={8} onPress={() => setShowConfirm((v) => !v)}>
                        <Ionicons
                            name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={C.muted}
                        />
                    </Pressable>
                }
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <AuthButton label="Get Started!" onPress={submit} loading={pending} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { gap: 18 },
    intro: { color: C.muted, fontSize: 15, lineHeight: 21 },
    error: { color: C.danger, fontSize: 14, textAlign: 'center' },
})
