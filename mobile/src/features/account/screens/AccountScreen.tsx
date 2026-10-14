import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Screen, Spinner, Text } from '@/common/ui'

import { SignOutRow, ThemeToggleRow } from '../components/AppearanceAndSession'
import { LinkCard } from '../components/LinkCard'
import { ProfileSummary } from '../components/ProfileSummary'
import { useCurrentUser } from '../hooks/useCurrentUser'

/**
 * Account settings. Shows the resident's profile snapshot and links out to the
 * edit, password and notification screens. Also hosts the dark-mode switch and sign-out.
 */
export function AccountScreen() {
    const { data, isLoading } = useCurrentUser()

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

            <View style={styles.session}>
                <ThemeToggleRow />
                <SignOutRow />
            </View>
        </Screen>
    )
}

const styles = StyleSheet.create({
    header: { gap: spacing.xs, marginBottom: spacing.xl },
    session: { gap: spacing.md, marginTop: spacing.lg },
})
