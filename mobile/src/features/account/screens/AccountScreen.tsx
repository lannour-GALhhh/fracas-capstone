import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Screen, Spinner, Text } from '@/common/ui'

import { unregisterPushDevice } from '@/features/alerts/hooks/usePushRegistration'
import { useAuth } from '@/features/auth/context/useAuth'

import { LinkCard } from '../components/LinkCard'
import { ProfileSummary } from '../components/ProfileSummary'
import { useCurrentUser } from '../hooks/useCurrentUser'

/**
 * Account tab. Shows the resident's profile snapshot and links out to the edit,
 * password and notification screens. Logout flips auth state → the app group
 * guard redirects back to the login stack.
 */
export function AccountScreen() {
    const { logout } = useAuth()
    const { data, isLoading } = useCurrentUser()
    const [signingOut, setSigningOut] = useState(false)

    const onSignOut = async () => {
        setSigningOut(true)
        try {
            await unregisterPushDevice() // stop pushes to this device before clearing the session
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

            {isLoading ? <Spinner /> : data ? <ProfileSummary user={data} /> : null}

            <LinkCard
                title="Edit profile"
                description="Your name, email, and permanent address."
                onPress={() => router.navigate('/edit-profile')}
            />
            <LinkCard
                title="Change password"
                description="Update the password you use to sign in."
                onPress={() => router.navigate('/change-password')}
            />
            <LinkCard
                title="Notification settings"
                description="Channels, quiet hours, and which barangay alerts you get."
                onPress={() => router.navigate('/notification-settings')}
            />

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
    footer: { marginTop: spacing.xxl },
})
