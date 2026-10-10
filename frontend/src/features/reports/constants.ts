import { BadgeCheck, CircleX, Clock, type LucideIcon } from 'lucide-react'
import type { ReportStatus } from './types'

export const STATUS_META: Record<ReportStatus, { label: string; icon: LucideIcon; tag: string }> = {
    pending: { label: 'Pending', icon: Clock, tag: 'bg-amber-500 text-white' },
    verified: { label: 'Verified', icon: BadgeCheck, tag: 'bg-emerald-600 text-white' },
    rejected: { label: 'Rejected', icon: CircleX, tag: 'bg-red-600 text-white' },
}

export const STATUS_ORDER: ReportStatus[] = ['pending', 'verified', 'rejected']

export type GridSize = 'small' | 'medium' | 'large'

export const GRID_SIZES: { value: GridSize; label: string; className: string }[] = [
    { value: 'small', label: 'S', className: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8' },
    { value: 'medium', label: 'M', className: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' },
    { value: 'large', label: 'L', className: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' },
]
