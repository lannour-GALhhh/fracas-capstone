/** Corner-radius scale. */
export const radius = {
    sm: 6,
    md: 10,
    lg: 16,
    pill: 999,
} as const

export type Radius = keyof typeof radius
