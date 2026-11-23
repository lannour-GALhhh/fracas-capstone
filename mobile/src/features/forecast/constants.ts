import type { ForecastBand } from './types'

/** PAGASA warning colours; `none` is drawn in the theme's primary instead. */
export const BAND_COLORS: Record<Exclude<ForecastBand, 'none'>, string> = {
    yellow: '#e0b100',
    orange: '#ee7a1c',
    red: '#d32f2f',
}

export const BAND_LABELS: Record<ForecastBand, string> = {
    none: 'Light or no rain',
    yellow: 'Heavy (yellow)',
    orange: 'Intense (orange)',
    red: 'Torrential (red)',
}

/** Bar length saturates here (mm/hr), the top of the orange band. */
export const BAR_FULL_MM_HR = 30
