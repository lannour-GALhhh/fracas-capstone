import type { GuidancePhase } from '../types'

/**
 * Before / during / after flood guidance for Zamboanga City residents. Bundled
 * so it's fully readable offline (airplane mode), when it matters most.
 */
export const GUIDANCE: GuidancePhase[] = [
    {
        id: 'before',
        title: 'Before a flood',
        icon: 'bag-handle-outline',
        steps: [
            'Prepare your Go-Bags',
            'Be aware of your local terrain and water sources',
            'Know where to evacuate',
            'Monitor the weather, some floods can come quickly',
            'Store important item high above flood level',
            'If you live in flood prone area, keep plastic sheeting sandbags and tools',
            'Keep a ladder and rope in case you need to escape to the roof',
            'If possible, keep a boat/floatation devices',
        ],
    },
    {
        id: 'during',
        title: 'During a flood',
        icon: 'warning-outline',
        steps: [
            'If you have time, disconnect electricity',
            'And turn off gas before evacuation',
            'Move to higher ground safe from landslides',
            'Do not walk or drive through flooded areas',
            'Go to the nearest evacuation center for your safety',
        ],
    },
    {
        id: 'after',
        title: 'After a flood',
        icon: 'home-outline',
        steps: [
            'Leave the evacuation area only when the authorities say it is safe to return home',
            'Report fallen trees and electric posts to proper authorities',
            'Check for wet or submerged electrical outlets and appliances before turning on electricity',
            'Check your house for possible damages and repair as necessary',
            'Make sure that the food and water for drinking are not contaminated by the flood water',
            'Throw away rainwater in cans, pots, and tires to prevent breeding of mosquitoes',
            'Avoid touching water in contact with electric wires',
        ],
    },
]
