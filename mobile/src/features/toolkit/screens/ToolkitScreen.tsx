import { StyleSheet, View } from 'react-native'

import { spacing } from '@/common/theme'
import { Screen, Text } from '@/common/ui'

import { GoBagChecklist } from '../components/GoBagChecklist'
import { HazardLegend } from '../components/HazardLegend'
import { HotlineRow } from '../components/HotlineRow'
import { PhaseCard } from '../components/PhaseCard'
import { SectionHeader } from '../components/SectionHeader'
import { GUIDANCE } from '../data/guidance'
import { HOTLINES } from '../data/hotlines'

/**
 * Offline disaster toolkit. Everything here is bundled static content — no
 * network — so it's fully usable in airplane mode during a flood: emergency
 * hotlines, before/during/after guidance, a persisted go-bag checklist, and the
 * hazard-level legend for the Status map.
 */
export function ToolkitScreen() {
    return (
        <Screen>
            <View style={styles.body}>
                <View style={styles.intro}>
                    <Text variant="title">Disaster toolkit</Text>
                    <Text variant="body" color="textMuted">
                        Works offline. Keep this handy before, during, and after a flood.
                    </Text>
                </View>

                <SectionHeader title="Emergency hotlines" subtitle="Tap to call." />
                {HOTLINES.map((hotline) => (
                    <HotlineRow key={hotline.id} hotline={hotline} />
                ))}

                <SectionHeader title="Flood safety" />
                {GUIDANCE.map((phase) => (
                    <PhaseCard key={phase.id} phase={phase} />
                ))}

                <SectionHeader title="Go-bag checklist" subtitle="Three days of essentials." />
                <GoBagChecklist />

                <SectionHeader title="Hazard levels" subtitle="What the map colors mean." />
                <HazardLegend />
            </View>
        </Screen>
    )
}

const styles = StyleSheet.create({
    body: { gap: spacing.md },
    intro: { gap: spacing.xs },
})
