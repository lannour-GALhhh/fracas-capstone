import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Collapsible, Screen, Text } from '@/common/ui'

import { GoBagChecklist } from '../components/GoBagChecklist'
import { HazardLegend } from '../components/HazardLegend'
import { HotlineRow } from '../components/HotlineRow'
import { PhaseCard } from '../components/PhaseCard'
import { GUIDANCE } from '../data/guidance'
import { HOTLINES } from '../data/hotlines'

/**
 * Offline disaster toolkit. Everything here is bundled static content — no
 * network — so it's fully usable in airplane mode during a flood. Sections are
 * collapsible so the page stays calm; residents open only what they need.
 */
export function ToolkitScreen() {
    return (
        <Screen edges={['bottom']}>
            <View style={styles.body}>
                <View style={styles.intro}>
                    <Text variant="title">Disaster toolkit</Text>
                    <Text variant="body" color="textMuted">
                        Works offline. Keep this handy before, during, and after a flood.
                    </Text>
                </View>

                <Collapsible
                    title="Flood safety"
                    subtitle="Before, during, and after."
                    icon="shield-checkmark-outline"
                    defaultOpen
                >
                    {GUIDANCE.map((phase) => (
                        <PhaseCard key={phase.id} phase={phase} />
                    ))}
                </Collapsible>

                <Collapsible
                    title="Go-bag checklist"
                    subtitle="Three days of essentials."
                    icon="bag-handle-outline"
                >
                    <GoBagChecklist />
                </Collapsible>

                <Collapsible title="Emergency hotlines" subtitle="Tap to call." icon="call-outline">
                    {HOTLINES.map((hotline) => (
                        <HotlineRow key={hotline.id} hotline={hotline} />
                    ))}
                </Collapsible>

                <Collapsible
                    title="Hazard levels"
                    subtitle="What the map colors mean."
                    icon="color-palette-outline"
                >
                    <HazardLegend />
                </Collapsible>
            </View>
        </Screen>
    )
}

const styles = StyleSheet.create({
    body: { gap: spacing.md },
    intro: { gap: spacing.xs, marginBottom: spacing.xs },
})
