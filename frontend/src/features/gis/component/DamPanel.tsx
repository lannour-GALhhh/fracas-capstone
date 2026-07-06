import { Droplets, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/common/ui/card'
import { Label } from '@/common/ui/label'
import { Badge } from '@/common/ui/badge'
import { Progress, ProgressLabel } from '@/common/ui/progress'
import LoadingCard from '@/common/components/LoadingCard'
import type { DamStatus } from '../types/api'
import SidePanel from './SidePanel'

/** How close the level sits between normal and critical, as a 0–100%. */
const criticalRatio = (d: DamStatus): number | null => {
    if (d.current_level == null || d.normal_level == null || d.critical_level == null) return null
    const span = d.critical_level - d.normal_level
    if (span <= 0) return null
    return Math.max(0, Math.min(100, ((d.current_level - d.normal_level) / span) * 100))
}

const fmt = (v: number | null | undefined): string =>
    v == null ? '—' : `${Math.round(v * 100) / 100}`

const StatTile = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
    <Card size='sm' className='gap-1'>
        <Label className='text-muted-foreground text-xs'>{label}</Label>
        <div className='flex items-baseline gap-1'>
            <span className='text-2xl font-semibold tabular-nums'>{value}</span>
            {unit && <span className='text-muted-foreground text-xs'>{unit}</span>}
        </div>
    </Card>
)

interface Props {
    data: DamStatus | undefined
    isLoading: boolean
    onClose: () => void
}

const DamPanel = ({ data, isLoading, onClose }: Props) => {
    const ratio = data ? criticalRatio(data) : null

    return (
        <SidePanel>
            <div className='flex items-start justify-between'>
                <h1 className='flex items-center gap-2 text-2xl font-medium'>
                    <Droplets className='size-5 text-blue-600' />
                    {data?.dam ?? 'Dam'}
                </h1>
                <button
                    type='button'
                    onClick={onClose}
                    aria-label='Close panel'
                    className='text-muted-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md transition-colors'
                >
                    <X className='size-4' />
                </button>
            </div>

            {isLoading && <LoadingCard />}

            {data && !data.has_data && (
                <p className='text-muted-foreground text-sm'>No readings yet for this dam.</p>
            )}

            {data && data.has_data && (
                <>
                    <Card className='gap-3'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-muted-foreground text-xs'>Level toward critical</Label>
                            {data.is_spilling && <Badge variant='destructive'>Spilling</Badge>}
                        </div>
                        <Progress value={ratio ?? 0}>
                            <ProgressLabel className='font-bold'>
                                {ratio == null ? 'Level unavailable' : `${ratio.toFixed(0)}%`}
                            </ProgressLabel>
                        </Progress>
                    </Card>

                    <div className='grid grid-cols-2 gap-3'>
                        <StatTile label='Current level' value={fmt(data.current_level)} unit='m' />
                        <StatTile label='Critical level' value={fmt(data.critical_level)} unit='m' />
                        <StatTile
                            label='Rate of change'
                            value={
                                data.rate_of_change == null
                                    ? '—'
                                    : `${data.rate_of_change > 0 ? '+' : ''}${fmt(data.rate_of_change)}`
                            }
                            unit='m/hr'
                        />
                        <StatTile label='Turbidity' value={fmt(data.turbidity)} unit='NTU' />
                        <StatTile label='Influence radius' value={fmt(data.influence_radius_km)} unit='km' />
                    </div>

                    <p className='text-muted-foreground text-xs'>
                        Downstream flood hazard fades with distance from the river, reaching zero past the
                        influence radius.
                    </p>

                    {data.recorded_at && (
                        <div className='text-muted-foreground mt-auto pt-2 text-center text-xs'>
                            Read {formatDistanceToNow(new Date(data.recorded_at), { addSuffix: true })}
                        </div>
                    )}
                </>
            )}
        </SidePanel>
    )
}

export default DamPanel
