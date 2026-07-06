import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Card, Text } from '@/common/ui'

import type { CurrentUser } from '../types'

/** One label/value line in the summary card. */
function Row({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text variant="caption" color="textMuted">
                {label}
            </Text>
            <Text variant="body">{value}</Text>
        </View>
    )
}

/** Read-only snapshot of the signed-in resident's account. */
export function ProfileSummary({ user }: { user: CurrentUser }) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username
    const barangay = user.address?.barangay?.trim()

    return (
        <Card style={styles.card}>
            <Text variant="subtitle">{name}</Text>
            {user.phone_number ? <Row label="Phone" value={user.phone_number} /> : null}
            {user.email ? <Row label="Email" value={user.email} /> : null}
            {barangay ? <Row label="Barangay" value={barangay} /> : null}
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { gap: spacing.sm, marginBottom: spacing.lg },
    row: { gap: 2 },
})
