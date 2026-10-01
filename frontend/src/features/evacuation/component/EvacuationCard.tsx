import { formatDistanceToNow } from 'date-fns'
import { BellRing, CheckCircle2, MapPin, Navigation, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/common/ui/card'
import { Badge } from '@/common/ui/badge'
import { cn } from '@/common/utils/utils'
import { TRIGGER_LABELS } from '../constants/evacuation'
import type { EvacuationAggregate } from '../types/api'
import EvacProgress from './EvacProgress'
import MarkSafeDialog from './MarkSafeDialog'

interface StatTileProps {
    icon: ReactNode
    label: string
    value: number
    sub?: string
    tone?: 'default' | 'safe' | 'warning'
}

const TONE: Record<NonNullable<StatTileProps['tone']>, string> = {
    default: 'text-foreground',
    safe: 'text-emerald-600',
    warning: 'text-amber-600',
}

/** A labelled count tile: icon + value + context, matching the console's KPI tile style. */
const StatTile = ({ icon, label, value, sub, tone = 'default' }: StatTileProps) => (
    <Card size='sm' className='flex-row items-center gap-3'>
        <div className={cn('shrink-0', TONE[tone])}>{icon}</div>
        <div className='min-w-0'>
            <p className='text-muted-foreground truncate text-xs'>{label}</p>
            <p className={cn('text-xl leading-tight font-semibold tabular-nums', TONE[tone])}>
                {value.toLocaleString()}
            </p>
            {sub && <p className='text-muted-foreground truncate text-xs'>{sub}</p>}
        </div>
    </Card>
)

interface EvacuationCardProps {
    evac: EvacuationAggregate
}

/** One active evacuation: headline + aggregate roster progress. */
const EvacuationCard = ({ evac }: EvacuationCardProps) => {
    const remaining = Math.max(evac.roster - evac.safe, 0)

    return (
        <Card className='gap-3'>
            <div className='flex flex-wrap items-start justify-between gap-2'>
                <div className='flex flex-col gap-1'>
                    <div className='flex items-center gap-2'>
                        <MapPin className='text-destructive size-4' />
                        <h2 className='text-lg font-semibold'>{evac.barangay.name}</h2>
                        <Badge variant='secondary'>{TRIGGER_LABELS[evac.trigger]}</Badge>
                    </div>
                    <span className='text-muted-foreground text-xs'>
                        Declared {formatDistanceToNow(new Date(evac.opened_at), { addSuffix: true })}
                        {' · '}
                        <span title={new Date(evac.updated_at).toLocaleString()}>
                            updated {formatDistanceToNow(new Date(evac.updated_at), { addSuffix: true })}
                        </span>
                    </span>
                </div>
                <MarkSafeDialog evacuationId={evac.evacuation_id} barangayName={evac.barangay.name} />
            </div>

            <div>
                <div className='mb-1.5 flex items-center justify-between text-xs'>
                    <span className='text-muted-foreground flex items-center gap-1'>
                        <Users className='size-3.5' />
                        {evac.safe.toLocaleString()} of {evac.roster.toLocaleString()} evacuated
                    </span>
                    <span className='font-medium'>{remaining.toLocaleString()} to go</span>
                </div>
                <EvacProgress
                    roster={evac.roster}
                    safe={evac.safe}
                    moving={evac.moving}
                    unaccounted={evac.unaccounted}
                />
            </div>

            <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                <StatTile
                    icon={<CheckCircle2 className='size-5' />}
                    label='Evacuated'
                    value={evac.safe}
                    tone='safe'
                />
                <StatTile
                    icon={<Navigation className='size-5' />}
                    label='Evacuated - Unsafe'
                    value={evac.moving}
                    tone='warning'
                />
                <StatTile
                    icon={<BellRing className='size-5' />}
                    label='Alerted'
                    value={evac.notified}
                />
                <StatTile
                    icon={<Users className='size-5' />}
                    label='Total Registered Users'
                    value={evac.roster}
                />
            </div>
        </Card>
    )
}

export default EvacuationCard
