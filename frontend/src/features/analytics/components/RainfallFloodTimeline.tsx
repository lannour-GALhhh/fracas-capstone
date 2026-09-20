import { format } from 'date-fns'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, XAxis, YAxis } from 'recharts'

import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/common/ui/chart'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '../constants/analytics'
import { useRainfallTimeline } from '../hooks/useAnalytics'
import type { AnalyticsWindow, FloodSeverity } from '../types/api'
import PanelCard from './PanelCard'

// Avg + peak share one mm axis, so they get a light→dark hue pair.
const AVG_COLOR = '#93b4f5'
const PEAK_COLOR = '#2563eb'

const chartConfig = {
    avg: { label: 'Avg 24h rain', color: AVG_COLOR },
    max: { label: 'Peak 24h rain', color: PEAK_COLOR },
} satisfies ChartConfig

const RainfallFloodTimeline = ({ days }: { days: AnalyticsWindow }) => {
    const { data, isLoading, isError, refetch } = useRainfallTimeline(days)

    const hourly = data?.granularity === 'hour'
    const fmtTick = (t: number) => format(new Date(t), hourly ? 'MMM d, ha' : 'MMM d')

    const chartData = (data?.series ?? []).map((s) => ({
        t: new Date(s.bucket).getTime(),
        avg: s.avg_24h,
        max: s.max_24h,
    }))
    const events = data?.events ?? []

    return (
        <PanelCard
            title='Rainfall & flood events'
            description='City-wide 24h rainfall; dots mark confirmed floods'
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            isEmpty={chartData.length === 0}
            emptyMessage='No rainfall recorded in this window.'
        >
            <ChartContainer config={chartConfig} className='aspect-auto h-56 w-full'>
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 2, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey='t'
                        type='number'
                        scale='time'
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={fmtTick}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={40}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={32}
                        tickFormatter={(v: number) => `${v}`}
                        label={{ value: 'mm', position: 'insideTopLeft', fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
                    />
                    <ChartTooltip
                        content={
                            <ChartTooltipContent
                                labelFormatter={(_, p) =>
                                    p?.[0] ? format(new Date(p[0].payload.t), 'MMM d, yyyy ha') : ''
                                }
                            />
                        }
                    />
                    <Area
                        dataKey='avg'
                        type='monotone'
                        stroke={AVG_COLOR}
                        fill={AVG_COLOR}
                        fillOpacity={0.25}
                        strokeWidth={2}
                        connectNulls
                    />
                    <Line
                        dataKey='max'
                        type='monotone'
                        stroke={PEAK_COLOR}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                    />
                    {events.map((e, i) => (
                        <ReferenceDot
                            key={`${e.occurred_at}-${i}`}
                            x={new Date(e.occurred_at).getTime()}
                            y={0}
                            r={5}
                            fill={SEVERITY_COLORS[e.severity]}
                            stroke='var(--background)'
                            strokeWidth={1.5}
                            ifOverflow='extendDomain'
                        />
                    ))}
                </ComposedChart>
            </ChartContainer>
            <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground'>
                <LegendSwatch color={AVG_COLOR} label='Avg 24h rain' />
                <LegendSwatch color={PEAK_COLOR} label='Peak 24h rain' />
                <span className='mx-1'>·</span>
                {(Object.keys(SEVERITY_COLORS) as FloodSeverity[]).map((s) => (
                    <LegendSwatch key={s} color={SEVERITY_COLORS[s]} label={SEVERITY_LABELS[s]} dot />
                ))}
            </div>
        </PanelCard>
    )
}

const LegendSwatch = ({ color, label, dot }: { color: string; label: string; dot?: boolean }) => (
    <span className='flex items-center gap-1'>
        <span
            className={dot ? 'size-2 rounded-full' : 'h-2 w-3 rounded-[2px]'}
            style={{ backgroundColor: color }}
        />
        {label}
    </span>
)

export default RainfallFloodTimeline
