import { Pressable, StyleSheet, Text } from 'react-native'

import { authColors as C } from '../theme/colors'

interface Props {
    label: string
    onPress: () => void
    loading?: boolean
    disabled?: boolean
}

/** Big pill primary CTA — the submit button style shared across the auth flow. */
export function AuthButton({ label, onPress, loading = false, disabled = false }: Props) {
    const isDisabled = disabled || loading
    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [styles.submit, (pressed || isDisabled) && styles.dim]}
        >
            <Text style={styles.text}>{label}</Text>
        </Pressable>
    )
}

/** Plain-text link button — secondary auth actions ("Resend code", "Forgot password"). */
export function AuthLinkButton({ label, onPress, disabled = false }: Omit<Props, 'loading'>) {
    return (
        <Pressable hitSlop={8} onPress={onPress} disabled={disabled} style={disabled && styles.dim}>
            <Text style={styles.link}>{label}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    submit: {
        minHeight: 56,
        borderRadius: 28,
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
    dim: { opacity: 0.65 },
    text: { color: C.onPrimary, fontSize: 18, fontWeight: '700' },
    link: { color: C.primary, fontSize: 15, fontWeight: '700', textAlign: 'center' },
})
