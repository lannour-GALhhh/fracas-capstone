/** Static content shapes for the offline disaster toolkit. All data is bundled. */

import type { IconName } from '@/common/ui'

/** One before/during/after phase of flood guidance. */
export interface GuidancePhase {
    id: 'before' | 'during' | 'after'
    title: string
    /** Leading icon (Ionicons name) shown in the phase header. */
    icon: IconName
    /** Ordered, actionable steps for this phase. */
    steps: string[]
}

/** An emergency contact the resident can dial with one tap. */
export interface Hotline {
    id: string
    name: string
    /** The agency behind the line (shown as a caption). */
    agency: string
    /** Human-readable number for display. */
    number: string
    /** Digits passed to `tel:` (no spaces or punctuation). */
    dial: string
}

/** A single go-bag item the resident can tick off. */
export interface GoBagItem {
    id: string
    label: string
    /** Optional clarifying hint (quantities, who it's for). */
    note?: string
}

/** A titled group of related go-bag items. */
export interface GoBagGroup {
    id: string
    title: string
    items: GoBagItem[]
}

/** One rung of the hazard ladder, mirroring the map/badge risk ramp. */
export interface HazardLevel {
    category: 'low' | 'medium' | 'high' | 'critical'
    label: string
    /** Background swatch (a RISK_COLORS entry). */
    color: string
    /** Readable text color over `color`. */
    onColor: string
    /** What this level means for the resident. */
    meaning: string
    /** The recommended action at this level. */
    action: string
}
