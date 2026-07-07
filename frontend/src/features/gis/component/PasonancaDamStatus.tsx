import { useState } from 'react'
import { ChevronDown, Droplets, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '@/common/ui/card'
import { Label } from '@/common/ui/label'
import { cn } from '@/common/utils/utils'
import type { DamStatus } from '../types/api'
import { criticalRatio, damStatus } from '../utils/dam'
import DamRateChart from './DamRateChart'
import DamTrendChart from './DamTrendChart'

interface Props {
    data: DamStatus | undefined
    isLoading: boolean
}

const Shell = ({ children }: { children: React.ReactNode }) => (
    <Card className='col-span-2 px-4'>
        <h5 className='text-muted-foreground font-semibold'>PASONANCA DAM STATUS</h5>
        {children}
    </Card>
)

/** Direction the level is moving, from the latest rate of change (m/hr). */
const RateArrow = ({ rate }: { rate: number | null | undefined }) => {
    if (rate == null || Math.abs(rate) < 0.005) return <Minus className='size-4 text-muted-foreground' />
    return rate > 0 ? (
        <TrendingUp className='size-4 text-destructive' />
    ) : (
        <TrendingDown className='size-4 text-blue-600' />
    )
}

const PasonancaDamStatus = ({ data, isLoading }: Props) => {
    const [isExpanded, setExpanded] = useState(false)

    if (isLoading || !data) {
        return (
            <Shell>
                <p className='text-muted-foreground text-sm'>{isLoading ? 'Loading…' : 'Unavailable'}</p>
            </Shell>
        )
    }

    if (!data.has_data) {
        return (
            <Shell>
                <p className='text-muted-foreground text-sm'>No readings yet.</p>
            </Shell>
        )
    }

    const ratio = criticalRatio(data)
    const status = damStatus(data)
    const history = data.history ?? []

    return (
        <Card className='col-span-2 cursor-pointer gap-2 px-4' onClick={() => setExpanded((e) => !e)}>
            <div className='flex items-center justify-between'>
                <h5 className='text-muted-foreground font-semibold'>PASONANCA DAM STATUS</h5>
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
                    <ChevronDown
                        className={cn(
                            'size-4 text-muted-foreground transition-transform',
                            isExpanded && 'rotate-180',
                        )}
                    />
                </div>
            </div>

            {/* Level vs critical: labelled, status-coloured bar. */}
            <div className='flex flex-col gap-1'>
                <div className='flex items-baseline justify-between text-sm'>
                    <span className='font-bold' style={{ color: status.color }}>
                        {ratio == null ? 'Level unavailable' : `${ratio.toFixed(0)}% toward critical`}
                    </span>
                    {data.current_level != null && (
                        <span className='text-muted-foreground tabular-nums'>
                            {data.current_level} m
                        </span>
                    )}
                </div>
                <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
                    <div
                        className='h-full rounded-full transition-all'
                        style={{ width: `${ratio ?? 0}%`, backgroundColor: status.color }}
                    />
                </div>
            </div>

            {history.length >= 2 && (
                <DamTrendChart
                    history={history}
                    criticalLevel={data.critical_level}
                    color={status.color}
                    variant='compact'
                />
            )}

            {isExpanded && history.length >= 2 && (
                <div className='border-t pt-2'>
                    <Label className='text-muted-foreground text-xs'>
                        Rate of change · last 24h (m/hr)
                    </Label>
                    <DamRateChart history={history} variant='compact' />
                </div>
            )}

            {isExpanded && (
                <div className='border-t pt-2 grid grid-cols-3 gap-3'>
                    <div className='flex flex-col gap-0.5'>
                        <Label className='text-muted-foreground text-xs'>Current / Critical</Label>
                        <div className='flex items-end gap-1'>
                            <span className='text-lg font-semibold tabular-nums'>
                                {data.current_level}/{data.critical_level}
                            </span>
                            <span className='text-muted-foreground text-xs'>m</span>
                        </div>
                    </div>
                    <div className='flex flex-col gap-0.5'>
                        <Label className='text-muted-foreground text-xs'>Rate of change</Label>
                        <div className='flex items-center gap-1'>
                            <RateArrow rate={data.rate_of_change} />
                            <span className='text-lg font-semibold tabular-nums'>
                                {data.rate_of_change == null
                                    ? '—'
                                    : `${data.rate_of_change > 0 ? '+' : ''}${data.rate_of_change}`}
                            </span>
                            <span className='text-muted-foreground text-xs'>m/hr</span>
                        </div>
                    </div>
                    <div className='flex flex-col gap-0.5'>
                        <Label className='text-muted-foreground text-xs'>Turbidity</Label>
                        <div className='flex items-end gap-1'>
                            <span className='text-lg font-semibold tabular-nums'>
                                {data.turbidity ?? '—'}
                            </span>
                            <span className='text-muted-foreground text-xs'>NTU</span>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    )
}

export default PasonancaDamStatus
