import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorState } from '@/common/components/ErrorState'
import { spacing, useTheme } from '@/common/theme'
import { Card, Spinner, Text } from '@/common/ui'

import { ToggleRow } from '../components/ToggleRow'
import { CHANNEL_META, CHANNEL_ORDER } from '../constants'
import { usePreferences, useUpdatePreferences } from '../hooks/usePreferences'
import type { Channel, NotificationPreference } from '../types'

const CHANNEL_FIELD: Record<Channel, keyof NotificationPreference> = {
    inapp: 'inapp_enabled',
    push: 'push_enabled',
    sms: 'sms_enabled',
}

/** Choose which channels deliver alerts. */
export function NotificationSettingsScreen() {
    const theme = useTheme()
    const prefs = usePreferences()
    const update = useUpdatePreferences()

    const setChannel = (channel: Channel, value: boolean) =>
        update.mutate({ [CHANNEL_FIELD[channel]]: value })

    return (
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]} edges={['bottom']}>
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
    body: { padding: spacing.lg, gap: spacing.lg },
    card: { gap: spacing.md },
})
