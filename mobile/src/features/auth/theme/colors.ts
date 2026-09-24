/**
 * Bespoke palette for the auth flow (login + registration). Deliberately
 * separate from the app's `common/theme` — these screens use a fixed light,
 * branded hero/sheet look rather than the app's light/dark semantic theme.
 */
export const authColors = {
    hero: '#208AEF',
    heroDeep: '#0F63C4',
    sheet: '#ffffff',
    text: '#0F1622',
    muted: '#6B7280',
    border: '#E3E8EF',
    inputBg: '#F4F7FB',
    primary: '#208AEF',
    onPrimary: '#ffffff',
    danger: '#D14343',
    onHero: '#EAF3FF',
} as const
