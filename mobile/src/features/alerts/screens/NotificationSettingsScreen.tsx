import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorState } from '@/common/components/ErrorState'
import { spacing, useTheme } from '@/common/theme'
import { Button, Card, Spinner, Text } from '@/common/ui'

import { ToggleRow } from '../components/ToggleRow'
import { CHANNEL_META, CHANNEL_ORDER } from '../constants'
import { useHomeSubscription } from '../hooks/useHomeSubscription'
import { usePreferences, useUpdatePreferences } from '../hooks/usePreferences'
import type { Channel, NotificationPreference } from '../types'

// A fixed overnight window keeps quiet hours dependency-free (no native time
// picker); a custom window is a later enhancement.
const QUIET_START = '22:00:00'
const QUIET_END = '06:00:00'

const CHANNEL_FIELD: Record<Channel, keyof NotificationPreference> = {
    inapp: 'inapp_enabled',
    push: 'push_enabled',
    sms: 'sms_enabled',
}

/** Choose which channels deliver alerts, quiet hours, and the barangay opt-in. */
export function NotificationSettingsScreen() {
    const theme = useTheme()
    const prefs = usePreferences()
    const update = useUpdatePreferences()
    const home = useHomeSubscription()

    const setChannel = (channel: Channel, value: boolean) =>
        update.mutate({ [CHANNEL_FIELD[channel]]: value })

    const quietOn = Boolean(prefs.data?.quiet_hours_start && prefs.data?.quiet_hours_end)
    const setQuiet = (value: boolean) =>
        update.mutate(
            value
                ? { quiet_hours_start: QUIET_START, quiet_hours_end: QUIET_END }
                : { quiet_hours_start: null, quiet_hours_end: null },
        )

    return (
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['bottom']}>
            <View style={styles.header}>
                <Button label="‹ Back" variant="ghost" onPress={() => router.back()} style={styles.back} />
                <Text variant="title">Notifications</Text>
            </View>

            {prefs.isLoading ? (
                <Spinner />
            ) : prefs.isError ? (
                <ErrorState
                    title="Can't load settings"
                    message="We couldn't load your notification preferences. Try again in a moment."
                    onRetry={prefs.refetch}
                />
            ) : (
                <View style={styles.body}>
                    <Card style={styles.card}>
                        <Text variant="label">Alerts for your barangay</Text>
                        {home.barangayName ? (
                            <ToggleRow
                                label={home.barangayName}
                                description="Receive flood advisories for your home barangay."
                                value={home.isSubscribed}
                                onValueChange={home.toggle}
                                disabled={home.isPending || home.isLoading}
                            />
                        ) : (
                            <Text variant="caption" color="textMuted">
                                Set your home barangay in your profile to receive alerts.
                            </Text>
                        )}
                    </Card>

                    <Card style={styles.card}>
                        <Text variant="label">Delivery channels</Text>
                        {CHANNEL_ORDER.map((channel) => (
                            <ToggleRow
                                key={channel}
                                label={CHANNEL_META[channel].label}
                                description={CHANNEL_META[channel].description}
                                value={Boolean(prefs.data?.[CHANNEL_FIELD[channel]])}
                                onValueChange={(v) => setChannel(channel, v)}
                                disabled={update.isPending}
                            />
                        ))}
                    </Card>

                    <Card style={styles.card}>
                        <ToggleRow
                            label="Quiet hours"
                            description="Hold text and push alerts overnight (10 PM – 6 AM). In-app alerts still arrive."
                            value={quietOn}
                            onValueChange={setQuiet}
                            disabled={update.isPending}
                        />
                    </Card>
                </View>
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    header: {
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },
    back: { alignSelf: 'flex-start', minHeight: 36, paddingHorizontal: 0 },
    body: { padding: spacing.lg, gap: spacing.lg },
    card: { gap: spacing.md },
})
