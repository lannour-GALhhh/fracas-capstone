import type { ForecastHour, ForecastSummary } from './types'

/** "3 PM" in the device's local time. */
export const hourLabel = (iso: string): string =>
    new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric' })

/** "today" / "tomorrow" / weekday, relative to the device's local date. */
export const dayLabel = (iso: string): string => {
    const d = new Date(iso)
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
    const days = Math.round((startOfDay(d) - startOfDay(new Date())) / 86_400_000)
    if (days === 0) return 'today'
    if (days === 1) return 'tomorrow'
    return d.toLocaleDateString(undefined, { weekday: 'long' })
}

/** "3 PM tomorrow" */
export const whenLabel = (h: ForecastHour): string => `${hourLabel(h.start)} ${dayLabel(h.start)}`

/** One cautious sentence for the heads-up; never phrased as a warning. */
export const headline = (s: ForecastSummary): string => {
    if (s.first_heavy) return `Heavy rain possible around ${whenLabel(s.first_heavy)}`
    if (s.peak && s.peak.mm_hr >= 2.5) return `Rain possible, peaking around ${whenLabel(s.peak)}`
    return 'No significant rain forecast through tomorrow'
}

/** "Sun, Nov 22" in the device's locale. */
export const shortDate = (d: Date): string =>
    d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
