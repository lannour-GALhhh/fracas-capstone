import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Card, Screen, Text } from '@/common/ui'

import { useAuth } from '@/features/auth/context/useAuth'

/**
 * Account tab. Profile details + preferences arrive in a later phase; for now it
 * surfaces the session and a sign-out. Logout flips auth state → the app group
 * guard redirects back to the login stack.
 */
export function AccountScreen() {
    const { logout } = useAuth()
    const [signingOut, setSigningOut] = useState(false)

    const onSignOut = async () => {
        setSigningOut(true)
        try {
            await logout()
        } finally {
            setSigningOut(false)
        }
    }

    return (
        <Screen>
            <View style={styles.header}>
                <Text variant="title">Account</Text>
                <Text variant="body" color="textMuted">
                    Manage your profile, address, and alert preferences.
                </Text>
            </View>

            <Card style={styles.card}>
                <Text variant="label" color="textMuted">
                    Coming soon
                </Text>
                <Text variant="body">
                    Editing your profile, permanent address, and notification settings will live
                    here.
                </Text>
            </Card>

            <View style={styles.footer}>
                <Button
                    label="Sign out"
                    variant="danger"
                    onPress={onSignOut}
                    loading={signingOut}
                />
            </View>
        </Screen>
    )
}

const styles = StyleSheet.create({
    header: { gap: spacing.xs, marginBottom: spacing.xl },
    card: { gap: spacing.xs },
    footer: { marginTop: spacing.xxl },
})
