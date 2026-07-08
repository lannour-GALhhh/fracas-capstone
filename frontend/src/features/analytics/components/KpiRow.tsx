import { Radio, TriangleAlert, Users, Waves } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from '@/common/ui/card'
import { cn } from '@/common/utils/utils'
import { useSummary } from '../hooks/useAnalytics'
import type { AnalyticsWindow } from '../types/api'

const nf = new Intl.NumberFormat()

interface TileProps {
    icon: ReactNode
    label: string
    value: string
    sub?: string
    /** Tints the value + icon for a status reading (e.g. barangays critical now). */
    tone?: 'default' | 'warning' | 'critical'
}

const TONE: Record<NonNullable<TileProps['tone']>, string> = {
    default: 'text-foreground',
    warning: 'text-[#b8860b]',
    critical: 'text-[#b01212]',
}

const StatTile = ({ icon, label, value, sub, tone = 'default' }: TileProps) => (
    <Card className='flex-row items-center gap-3 p-4'>
        <div className={cn('shrink-0', TONE[tone])}>{icon}</div>
        <div className='min-w-0'>
            <p className='text-xs text-muted-foreground'>{label}</p>
            <p className={cn('text-2xl font-semibold leading-tight tabular-nums', TONE[tone])}>
                {value}
            </p>
            {sub && <p className='truncate text-xs text-muted-foreground'>{sub}</p>}
        </div>
    </Card>
)

const Skeleton = () => (
    <Card className='h-[76px] animate-pulse bg-muted/60' aria-hidden>
        <span className='sr-only'>Loading</span>
    </Card>
)

/** Situational KPI strip: windowed flood impact + current model state. */
const KpiRow = ({ days }: { days: AnalyticsWindow }) => {
    const { data, isLoading } = useSummary(days)

    if (isLoading || !data) {
        return (
            <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} />
                ))}
            </div>
        )
    }

    const recall = data.validation?.recall

    return (
        <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
            <StatTile
                icon={<Waves className='size-5' />}
                label='Flood events'
                value={nf.format(data.flood_events)}
                sub='confirmed, this window'
            />
            <StatTile
                icon={<Users className='size-5' />}
                label='People affected'
                value={nf.format(data.people_affected)}
                sub={`${nf.format(data.people_evacuated)} evacuated`}
            />
            <StatTile
                icon={<TriangleAlert className='size-5' />}
                label='At risk now'
                tone={data.barangays_critical > 0 ? 'critical' : 'default'}
                value={nf.format(data.barangays_critical)}
                sub={`+${nf.format(data.barangays_high)} high`}
            />
            <StatTile
                icon={<Radio className='size-5' />}
                label='Model recall'
                value={recall != null ? `${(recall * 100).toFixed(0)}%` : '—'}
                sub={recall != null ? 'latest validation' : 'no runs yet'}
            />
        </div>
    )
}

export default KpiRow
