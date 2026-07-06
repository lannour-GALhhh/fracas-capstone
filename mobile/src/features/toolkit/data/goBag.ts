import type { GoBagGroup } from '../types'

/**
 * Go-bag checklist — three days of essentials, grouped. Item `id`s are stable
 * because the ticked state is persisted against them (see `useGoBagChecklist`);
 * never renumber an existing id or a resident's progress will shift.
 */
export const GO_BAG: GoBagGroup[] = [
    {
        id: 'water-food',
        title: 'Water & food',
        items: [
            { id: 'water', label: 'Drinking water', note: '3 liters per person, per day' },
            { id: 'food', label: 'Ready-to-eat food', note: 'Canned goods, biscuits, energy bars' },
            { id: 'can-opener', label: 'Manual can opener' },
            { id: 'baby-food', label: 'Baby formula / food', note: 'If you have an infant' },
        ],
    },
    {
        id: 'health',
        title: 'Health & hygiene',
        items: [
            { id: 'first-aid', label: 'First-aid kit' },
            { id: 'medicine', label: 'Prescription medicines', note: '7-day supply' },
            { id: 'masks', label: 'Face masks & alcohol / sanitizer' },
            { id: 'toiletries', label: 'Toiletries & sanitary items' },
        ],
    },
    {
        id: 'documents',
        title: 'Documents & money',
        items: [
            { id: 'ids', label: 'IDs & documents', note: 'Sealed in a waterproof bag' },
            { id: 'cash', label: 'Cash in small bills' },
            { id: 'contacts', label: 'Written list of emergency contacts' },
        ],
    },
    {
        id: 'tools',
        title: 'Tools & light',
        items: [
            { id: 'flashlight', label: 'Flashlight + spare batteries' },
            { id: 'power-bank', label: 'Fully charged power bank' },
            { id: 'radio', label: 'Battery or hand-crank radio' },
            { id: 'whistle', label: 'Whistle', note: 'To signal for help' },
            { id: 'matches', label: 'Waterproof matches or lighter' },
        ],
    },
    {
        id: 'clothing',
        title: 'Clothing & comfort',
        items: [
            { id: 'clothes', label: 'Change of clothes + rain gear' },
            { id: 'shoes', label: 'Sturdy closed shoes' },
            { id: 'blanket', label: 'Emergency blanket' },
            { id: 'special-needs', label: 'Extras for children, elderly, or PWDs' },
        ],
    },
]

/** Total tickable items, precomputed for the progress readout. */
export const GO_BAG_TOTAL = GO_BAG.reduce((sum, group) => sum + group.items.length, 0)
