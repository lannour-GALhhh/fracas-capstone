/** Query keys for the resident evacuation feed. */
export const evacuationKeys = {
    mine: ['evacuation', 'mine'] as const,
    mineAt: (id: number | null) => ['evacuation', 'mine', id] as const,
}
