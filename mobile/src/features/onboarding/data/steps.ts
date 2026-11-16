import type { IconName } from '@/common/ui'

export interface OnboardingStep {
    id: string
    icon: IconName
    title: string
    body: string
    /** Short "what to do / expect" lines shown under the body. */
    bullets?: string[]
    /** Renders the risk-level legend under the copy. */
    showRiskLevels?: boolean
}

/** The guided tour, in order. Plain data so copy can change without touching UI. */
export const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 'welcome',
        icon: 'water-outline',
        title: 'Welcome to FRACAS',
        body: 'Your flood early-warning companion for Zamboanga City. A quick tour of what to do and what to expect.',
        bullets: [
            'Risk is re-checked every 15 minutes',
            'Alerts reach you before a barangay turns critical',
            'The toolkit works even without a signal',
        ],
    },
    {
        id: 'permissions',
        icon: 'location-outline',
        title: 'Allow location & notifications',
        body: 'These two permissions let FRACAS protect you.',
        bullets: [
            'Location finds your barangay and your nearest evacuation center',
            'Notifications deliver flood alerts, even when the app is closed',
            'Your home barangay is subscribed to alerts automatically',
        ],
    },
    {
        id: 'status',
        icon: 'map-outline',
        title: 'Read the flood map',
        body: 'The GIS tab colours every barangay by flood risk, from white (low) to deep red (critical).',
        bullets: [
            'Tap your barangay to see its current level',
            'No rain means no flood risk, so the map stays low in dry weather',
            'The "last updated" time shows how fresh the data is',
        ],
        showRiskLevels: true,
    },
    {
        id: 'alerts',
        icon: 'notifications-outline',
        title: 'Alerts, in your pocket',
        body: 'When your barangay turns critical you get a push alert, and it is saved in the bell for later.',
        bullets: [
            'Tap an alert for the full details',
            'Operators can also broadcast city-wide notices',
            'Choose what you receive in Notification settings',
        ],
    },
    {
        id: 'reports',
        icon: 'camera-outline',
        title: 'Report what you see',
        body: 'Spotted flooding? Send a report with a photo so operators can respond faster.',
        bullets: ['Open the Reports tab to submit one', 'Open any report to follow its status'],
    },
    {
        id: 'toolkit',
        icon: 'medkit-outline',
        title: 'Your offline toolkit',
        body: 'Guidance and hotlines are saved on your phone, so they work in airplane mode.',
        bullets: [
            'Before, during and after-a-flood steps',
            'A go-bag checklist that remembers what you packed',
            'Emergency hotlines one tap away',
        ],
    },
    {
        id: 'act',
        icon: 'shield-checkmark-outline',
        title: 'If it turns critical',
        body: 'Stay calm and follow the During-a-flood steps.',
        bullets: [
            'Disconnect electricity and gas if you have time',
            'Move to higher ground and never wade through floodwater',
            'Head to the nearest evacuation center',
            'Return home only when authorities say it is safe',
        ],
    },
]
