import { useTheme } from '@/common/theme'

/**
 * Bespoke palettes for the auth flow (login + registration). Deliberately separate
 * from the app's `common/theme` — these screens use a branded hero/sheet look — but
 * they still follow the active light/dark scheme (device by default).
 */
export interface AuthPalette {
    hero: string
    heroDeep: string
    sheet: string
    text: string
    muted: string
    border: string
    inputBg: string
    primary: string
    onPrimary: string
    danger: string
    onHero: string
}

const light: AuthPalette = {
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
}

const dark: AuthPalette = {
    hero: '#0F63C4',
    heroDeep: '#0A4A94',
    sheet: '#111827',
    text: '#F1F5F9',
    muted: '#9CA3AF',
    border: '#263244',
    inputBg: '#1C2636',
    primary: '#3B9BFF',
    onPrimary: '#ffffff',
    danger: '#F27878',
    onHero: '#EAF3FF',
}

/** The auth palette for the active color scheme. Stable identity per scheme. */
export function useAuthColors(): AuthPalette {
    return useTheme().scheme === 'dark' ? dark : light
}
