/** Compact "x min ago" relative time. Dependency-free (no date-fns on mobile). */
export function timeAgo(iso: string | null | undefined): string | null {
    if (!iso) return null
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return null

    const seconds = Math.round((Date.now() - then) / 1000)
    if (seconds < 60) return 'just now'

    const units: [limit: number, div: number, name: string][] = [
        [3600, 60, 'min'],
        [86400, 3600, 'hr'],
        [604800, 86400, 'day'],
    ]
    for (const [limit, div, name] of units) {
        if (seconds < limit) {
            const value = Math.floor(seconds / div)
            return `${value} ${name}${value === 1 ? '' : 's'} ago`
        }
    }
    const weeks = Math.floor(seconds / 604800)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
}
