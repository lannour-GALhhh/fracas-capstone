import { Droplets, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/common/ui/card'
import { Label } from '@/common/ui/label'
import LoadingCard from '@/common/components/LoadingCard'
import { cn } from '@/common/utils/utils'
import type { DamStatus } from '../types/api'
import { criticalRatio, damStatus } from '../utils/dam'
import DamRateChart from './DamRateChart'
import DamTrendChart from './DamTrendChart'
import SidePanel from './SidePanel'

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
    const status = data ? damStatus(data) : null
    const history = data?.history ?? []

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

            {data && data.has_data && status && (
                <>
                    <Card className='gap-3'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-muted-foreground text-xs'>Level toward critical</Label>
                            <div className='flex items-center gap-1.5'>
                                {data.is_spilling && (
                                    <span
                                        className='inline-flex h-5 items-center gap-1 rounded-full bg-blue-500/10 px-2 text-xs font-medium text-blue-600 dark:text-blue-400'
                                        title='Water is spilling over the dam crest (normal during rain).'
                                    >
                                        <Droplets className='size-3' />
                                        Spilling
                                    </span>
                                )}
                                <span
                                    className={cn(
                                        'inline-flex h-5 items-center rounded-full px-2 text-xs font-semibold',
                                        status.badgeClass,
                                    )}
                                >
                                    {status.label}
                                </span>
                            </div>
                        </div>
                        <div className='flex items-baseline justify-between text-sm'>
                            <span className='font-bold' style={{ color: status.color }}>
                                {ratio == null ? 'Level unavailable' : `${ratio.toFixed(0)}%`}
                            </span>
                            {data.current_level != null && (
                                <span className='text-muted-foreground tabular-nums'>
                                    {fmt(data.current_level)} m
                                </span>
                            )}
                        </div>
                        <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
                            <div
                                className='h-full rounded-full transition-all'
                                style={{ width: `${ratio ?? 0}%`, backgroundColor: status.color }}
                            />
                        </div>
                    </Card>

                    {history.length >= 2 && (
                        <>
                            <Card className='gap-2'>
                                <Label className='text-muted-foreground text-xs'>
                                    Water level · last 24h
                                </Label>
                                <DamTrendChart
                                    history={history}
                                    normalLevel={data.normal_level}
                                    criticalLevel={data.critical_level}
                                    color={status.color}
                                    variant='full'
                                />
                            </Card>
                            <Card className='gap-2'>
                                <Label className='text-muted-foreground text-xs'>
                                    Rate of change · last 24h (m/hr)
                                </Label>
                                <DamRateChart history={history} variant='full' />
                            </Card>
                        </>
                    )}

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
