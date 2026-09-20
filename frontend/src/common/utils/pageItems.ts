/** Page numbers with `'ellipsis'` gaps, e.g. `1 … 4 5 6 … 20`. */
export const getPageItems = (
    page: number,
    total: number,
): (number | 'ellipsis')[] => {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1)
    }

    const items: (number | 'ellipsis')[] = [1]
    const start = Math.max(2, page - 1)
    const end = Math.min(total - 1, page + 1)

    if (start > 2) items.push('ellipsis')
    for (let p = start; p <= end; p++) items.push(p)
    if (end < total - 1) items.push('ellipsis')

    items.push(total)
    return items
}
