import { Linking, StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Card, Text } from '@/common/ui'

import type { Hotline } from '../types'

interface Props {
    hotline: Hotline
}

/** One emergency contact with a one-tap dialer. */
export function HotlineRow({ hotline }: Props) {
    return (
        <Card style={styles.card}>
            <View style={styles.info}>
                <Text variant="subtitle">{hotline.name}</Text>
                <Text variant="caption" color="textMuted">
                    {hotline.agency}
                </Text>
                <Text variant="body">{hotline.number}</Text>
            </View>
            <Button
                label="Call"
                variant="secondary"
                onPress={() => Linking.openURL(`tel:${hotline.dial}`)}
            />
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    info: { flex: 1, gap: spacing.xs / 2 },
})
