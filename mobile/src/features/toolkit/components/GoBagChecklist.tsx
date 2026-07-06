import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Button, Card, Checkbox, Text } from '@/common/ui'

import { GO_BAG, GO_BAG_TOTAL } from '../data/goBag'
import { useGoBagChecklist } from '../hooks/useGoBagChecklist'

/**
 * The persisted go-bag checklist. Ticks are saved to AsyncStorage, so a resident
 * can pack over several sessions and offline. Shows overall progress and a reset.
 */
export function GoBagChecklist() {
    const { checked, doneCount, ready, toggle, reset } = useGoBagChecklist()

    return (
        <Card style={styles.card}>
            <View style={styles.header}>
                <Text variant="label" color="textMuted">
                    {doneCount} of {GO_BAG_TOTAL} packed
                </Text>
                {doneCount > 0 ? (
                    <Button label="Reset" variant="ghost" onPress={reset} />
                ) : null}
            </View>

            {GO_BAG.map((group) => (
                <View key={group.id} style={styles.group}>
                    <Text variant="subtitle">{group.title}</Text>
                    {group.items.map((item) => (
                        <Checkbox
                            key={item.id}
                            checked={ready && Boolean(checked[item.id])}
                            onToggle={() => toggle(item.id)}
                        >
                            <View style={styles.item}>
                                <Text variant="body">{item.label}</Text>
                                {item.note ? (
                                    <Text variant="caption" color="textMuted">
                                        {item.note}
                                    </Text>
                                ) : null}
                            </View>
                        </Checkbox>
                    ))}
                </View>
            ))}
        </Card>
    )
}

const styles = StyleSheet.create({
    card: { gap: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    group: { gap: spacing.md },
    item: { gap: spacing.xs / 2 },
})
