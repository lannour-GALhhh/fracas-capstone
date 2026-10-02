import type { EvacuationProperties } from '@/features/gis/poi/types'

export type StatusFilter = 'all' | 'active' | 'inactive'

export interface CenterFilterState {
    search: string
    barangay: number[]
    minCapacity: string
    maxCapacity: string
    status: StatusFilter
}

export const EMPTY_FILTERS: CenterFilterState = {
    search: '',
    barangay: [],
    minCapacity: '',
    maxCapacity: '',
    status: 'all',
}

export const isFiltered = (f: CenterFilterState) =>
    JSON.stringify(f) !== JSON.stringify(EMPTY_FILTERS)

/** Pure predicate: does a center match every active filter? */
export const matchesFilters = (p: EvacuationProperties, f: CenterFilterState) => {
    if (f.search && !p.name.toLowerCase().includes(f.search.trim().toLowerCase())) return false
    if (f.barangay.length && (p.barangay == null || !f.barangay.includes(p.barangay))) return false
    if (f.status !== 'all' && p.is_active !== (f.status === 'active')) return false
    const min = f.minCapacity === '' ? null : Number(f.minCapacity)
    const max = f.maxCapacity === '' ? null : Number(f.maxCapacity)
    if (min !== null || max !== null) {
        if (p.capacity == null) return false
        if (min !== null && p.capacity < min) return false
        if (max !== null && p.capacity > max) return false
    }
    return true
}
