import type { TextStyle } from 'react-native'

/** Text style presets, keyed by semantic variant (consumed by the `Text` primitive). */
export const typography = {
    title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
    subtitle: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
    body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
    label: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
} as const satisfies Record<string, TextStyle>

export type TextVariant = keyof typeof typography
