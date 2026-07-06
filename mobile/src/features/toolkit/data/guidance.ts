import type { GuidancePhase } from '../types'

/**
 * Before / during / after flood guidance for Zamboanga City residents. Bundled
 * so it's fully readable offline (airplane mode), when it matters most.
 */
export const GUIDANCE: GuidancePhase[] = [
    {
        id: 'before',
        title: 'Before a flood',
        icon: '🎒',
        steps: [
            'Check your barangay’s hazard level and nearest evacuation center in the Status tab.',
            'Pack a go-bag with three days of essentials (see the checklist below).',
            'Keep phones charged and power banks full; save these hotlines while you have signal.',
            'Seal IDs, land titles, and other documents in waterproof bags.',
            'Agree on a family meeting point and an out-of-town contact person.',
            'When heavy rain is forecast, move appliances, valuables, and vehicles to higher ground.',
        ],
    },
    {
        id: 'during',
        title: 'During a flood',
        icon: '⚠️',
        steps: [
            'Evacuate immediately if officials advise it — do not wait for the water to rise.',
            'Never walk or drive through floodwater: 15 cm can knock you down, 60 cm can sweep a car away.',
            'Stay away from the Tumaga River, creeks, canals, and coastal areas during heavy rain.',
            'If water enters your home, switch off electricity at the main breaker.',
            'Bring your go-bag and help children, the elderly, and PWDs move first.',
            'Keep listening to the radio and official channels for updates.',
        ],
    },
    {
        id: 'after',
        title: 'After a flood',
        icon: '🏠',
        steps: [
            'Return home only when authorities declare it safe.',
            'Watch for weakened structures, live wires, and debris or snakes in the water.',
            'Boil or disinfect drinking water until the supply is confirmed safe.',
            'Throw away any food that touched floodwater.',
            'Clean and disinfect everything that got wet; see a doctor for open wounds (leptospirosis risk).',
            'Photograph the damage for assistance and insurance claims.',
        ],
    },
]
