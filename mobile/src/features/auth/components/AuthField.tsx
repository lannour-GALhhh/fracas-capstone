import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'

import { authColors as C } from '../theme/colors'

interface Props extends TextInputProps {
    label: string
    error?: string
    icon: keyof typeof Ionicons.glyphMap
    accessory?: React.ReactNode
}

/** Pill-shaped input with a leading icon — the field style shared across the auth flow. */
export function AuthField({ label, error, icon, accessory, style, ...inputProps }: Props) {
    return (
        <View style={styles.field}>
            <View style={[styles.wrap, !!error && styles.wrapError]}>
                <Ionicons name={icon} size={20} color={C.muted} style={styles.icon} />
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
            {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
    )
}

const styles = StyleSheet.create({
    field: { gap: 8 },
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.inputBg,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'transparent',
        paddingHorizontal: 18,
    },
    wrapError: { borderColor: C.danger },
    icon: { marginRight: 10 },
    input: {
        flex: 1,
        minHeight: 56,
        fontSize: 18,
        color: C.text,
    },
    accessory: { paddingLeft: 10 },
    error: { color: C.danger, fontSize: 13 },
})
