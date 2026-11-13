import { StyleSheet, View } from 'react-native'

import { radius, spacing, useTheme } from '@/common/theme'
import { Card, Icon, type IconName, Text } from '@/common/ui'

import type { CurrentUser } from '../types'

const AVATAR = 72

/** One icon + value chip in the summary card's detail line. */
function Detail({ icon, value }: { icon: IconName; value: string }) {
    const theme = useTheme()
    return (
        <View style={styles.detail}>
            <Icon name={icon} size={16} color={theme.colors.textMuted} />
            <Text variant="caption" numberOfLines={1} style={styles.detailText}>
                {value}
            </Text>
        </View>
    )
}

/** Read-only snapshot of the signed-in resident's account. */
export function ProfileSummary({ user }: { user: CurrentUser }) {
    const theme = useTheme()
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    // Fall back to the phone number until the resident has filled in a name.
    const title = fullName || user.phone_number || user.username
    const barangay = user.address?.barangay?.trim()

    return (
        <View style={styles.wrap}>
            <View
                style={[
                    styles.avatar,
                    { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.bg },
                ]}
            >
                <Icon name="person" size={AVATAR * 0.55} color={theme.colors.textMuted} />
            </View>
            <Card style={styles.card}>
                <Text variant="subtitle" style={styles.name}>
                    {title}
                </Text>
                <View style={styles.details}>
                    {user.phone_number && user.phone_number !== title ? (
                        <Detail icon="call-outline" value={user.phone_number} />
                    ) : null}
                    {barangay ? <Detail icon="location-outline" value={barangay} /> : null}
                    {user.email ? <Detail icon="mail-outline" value={user.email} /> : null}
                </View>
            </Card>
        </View>
    )
}

const styles = StyleSheet.create({
    // Room above the card for the half of the avatar that overhangs it.
    wrap: { marginTop: AVATAR / 2, marginBottom: spacing.lg, alignItems: 'center' },
    card: { width: '100%', paddingTop: AVATAR / 2 + spacing.sm, alignItems: 'center' },
    avatar: {
        position: 'absolute',
        top: -AVATAR / 2,
        zIndex: 1,
        width: AVATAR,
        height: AVATAR,
        borderRadius: radius.pill,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: { textAlign: 'center' },
    details: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: spacing.lg,
        rowGap: spacing.xs,
    },
    detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
    detailText: { flexShrink: 1 },
})
