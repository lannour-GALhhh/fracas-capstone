import { format } from 'date-fns'
import { Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/common/ui/chart'
import type { DamHistoryPoint } from '../types/api'
import { DAM_FALLING_COLOR, DAM_RISING_COLOR } from '../utils/dam'

interface Props {
    history: DamHistoryPoint[]
    /** Compact = axis-less bars for the summary card; full = labelled for the panel. */
    variant?: 'compact' | 'full'
}

const chartConfig = { rate: { label: 'Rate of change' } } satisfies ChartConfig

/**
 * Hourly rate of change (m/hr) of the dam level as a signed bar chart: bars
 * above the zero line are the level rising (toward flood, amber), bars below
 * are it falling (blue). Points without a computed rate are dropped.
 */
const DamRateChart = ({ history, variant = 'full' }: Props) => {
    const data = history
        .filter((r) => r.rate_of_change != null)
        .map((r) => ({ t: new Date(r.recorded_at).getTime(), rate: r.rate_of_change as number }))

    if (data.length < 2) return null

    const compact = variant === 'compact'

    return (
        <ChartContainer config={chartConfig} className={`aspect-auto w-full ${compact ? 'h-16' : 'h-40'}`}>
            <BarChart data={data} margin={{ top: 4, right: compact ? 2 : 12, left: 2, bottom: 0 }}>
                <ReferenceLine y={0} stroke='var(--border)' />
                <XAxis
                    dataKey='t'
                    type='number'
                    scale='time'
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(t: number) => format(new Date(t), 'ha')}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={36}
                    hide={compact}
                />
                <YAxis
                    domain={['auto', 'auto']}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                    tickFormatter={(v: number) => v.toFixed(2)}
                    hide={compact}
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            labelFormatter={(_, p) =>
                                p?.[0] ? format(new Date(p[0].payload.t), 'MMM d, h:mm a') : ''
                            }
                            formatter={(value) => (
                                <span className='tabular-nums'>
                                    {(value as number) > 0 ? '+' : ''}
                                    {(value as number).toFixed(3)} m/hr
                                </span>
                            )}
                        />
                    }
                />
                <Bar dataKey='rate' radius={2} isAnimationActive={false}>
                    {data.map((d) => (
                        <Cell
                            key={d.t}
                            fill={d.rate >= 0 ? DAM_RISING_COLOR : DAM_FALLING_COLOR}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}

export default DamRateChart
