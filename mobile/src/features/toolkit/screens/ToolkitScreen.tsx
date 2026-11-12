import type { ComponentProps } from 'react'
import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Collapsible, Screen, Text } from '@/common/ui'

import { GoBagChecklist } from '../components/GoBagChecklist'
import { HotlineRow } from '../components/HotlineRow'
import { PhaseCard } from '../components/PhaseCard'
import { GUIDANCE } from '../data/guidance'
import { HOTLINES } from '../data/hotlines'

/**
 * Offline disaster toolkit. Everything here is bundled static content — no
 * network — so it's fully usable in airplane mode during a flood. Sections are
 * collapsible so the page stays calm; residents open only what they need.
 */
export function ToolkitScreen({ edges }: { edges?: ComponentProps<typeof Screen>['edges'] }) {
    return (
        <Screen edges={edges}>
            <View style={styles.body}>
                <View style={styles.intro}>
                    <Text variant="title">Disaster toolkit</Text>
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
            </View>
        </Screen>
    )
}

const styles = StyleSheet.create({
    body: { gap: spacing.md },
    intro: { gap: spacing.xs, marginBottom: spacing.xs },
})
