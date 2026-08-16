import { formatDistanceToNow } from 'date-fns'
import { MapPin, Users } from 'lucide-react'
import { Card } from '@/common/ui/card'
import { Badge } from '@/common/ui/badge'
import { SEGMENT_COLORS, TRIGGER_LABELS } from '../constants/evacuation'
import type { EvacuationAggregate } from '../types/api'
import EvacProgress from './EvacProgress'
import MarkSafeDialog from './MarkSafeDialog'

/** A labelled count with a color dot matching the progress segment. */
const CountStat = ({ label, value, color }: { label: string; value: number; color?: string }) => (
    <div className='flex flex-col gap-0.5'>
        <span className='text-muted-foreground flex items-center gap-1 text-xs'>
            {color && (
                <span
                    className='aspect-square w-2 rounded-full'
                    style={{ backgroundColor: color }}
                />
            )}
            {label}
        </span>
        <span className='text-xl font-semibold tabular-nums'>{value.toLocaleString()}</span>
    </div>
)

interface EvacuationCardProps {
    evac: EvacuationAggregate
}

/**
 * One active evacuation: headline, roster progress, and the aggregate counts.
 * Deliberately aggregate-only — the per-resident roster is never rendered here.
 */
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

            <div className='grid grid-cols-4 gap-2'>
                <CountStat label='Evacuated' value={evac.safe} color={SEGMENT_COLORS.safe} />
                <CountStat label='Moving' value={evac.moving} color={SEGMENT_COLORS.moving} />
                <CountStat
                    label='Unaccounted'
                    value={evac.unaccounted}
                    color={SEGMENT_COLORS.unaccounted}
                />
                <CountStat label='Total residents' value={evac.roster} />
            </div>
        </Card>
    )
}

export default EvacuationCard
