import { format } from 'date-fns'
import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    LineChart,
    ReferenceDot,
    ReferenceLine,
    XAxis,
    YAxis,
} from 'recharts'

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/common/ui/chart'
import type { DamHistoryPoint } from '../types/api'
import { DAM_CRITICAL_LINE_COLOR, DAM_NORMAL_LINE_COLOR } from '../utils/dam'

interface Props {
    history: DamHistoryPoint[]
    normalLevel?: number
    criticalLevel?: number
    /** Status accent colour for the trend line/area. */
    color: string
    /** Compact = axis-less sparkline for the summary card; full = labelled chart. */
    variant?: 'compact' | 'full'
}

const toChartData = (history: DamHistoryPoint[]) =>
    history.map((r) => ({
        t: new Date(r.recorded_at).getTime(),
        level: r.water_level,
        spilling: r.is_spilling,
    }))

/**
 * Recent water-level trend against the normal/critical thresholds. The compact
 * variant is a bare sparkline for the map's summary card; the full variant adds
 * axes, threshold reference lines and spilling markers for the side panel.
 */
const DamTrendChart = ({ history, normalLevel, criticalLevel, color, variant = 'full' }: Props) => {
    const chartData = toChartData(history)
    if (chartData.length < 2) return null

    const chartConfig = { level: { label: 'Water level', color } } satisfies ChartConfig

    if (variant === 'compact') {
        const gradientId = 'dam-spark-fill'
        return (
            <ChartContainer config={chartConfig} className='aspect-auto h-12 w-full'>
                <AreaChart data={chartData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='0%' stopColor={color} stopOpacity={0.35} />
                            <stop offset='100%' stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    {criticalLevel != null && (
                        <ReferenceLine
                            y={criticalLevel}
                            stroke={DAM_CRITICAL_LINE_COLOR}
                            strokeDasharray='3 3'
                            strokeOpacity={0.6}
                        />
                    )}
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Area
                        dataKey='level'
                        type='monotone'
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#${gradientId})`}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ChartContainer>
        )
    }

    return (
        <ChartContainer config={chartConfig} className='aspect-auto h-44 w-full'>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 2, bottom: 0 }}>
                <CartesianGrid vertical={false} />
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
                />
                <YAxis
                    domain={['auto', 'auto']}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                    tickFormatter={(v: number) => v.toFixed(1)}
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            labelFormatter={(_, p) =>
                                p?.[0] ? format(new Date(p[0].payload.t), 'MMM d, h:mm a') : ''
                            }
                        />
                    }
                />
                {normalLevel != null && (
                    <ReferenceLine
                        y={normalLevel}
                        stroke={DAM_NORMAL_LINE_COLOR}
                        strokeDasharray='4 4'
                        label={{ value: 'Normal', position: 'insideBottomRight', fontSize: 10, fill: DAM_NORMAL_LINE_COLOR }}
                    />
                )}
                {criticalLevel != null && (
                    <ReferenceLine
                        y={criticalLevel}
                        stroke={DAM_CRITICAL_LINE_COLOR}
                        strokeDasharray='4 4'
                        label={{ value: 'Critical', position: 'insideTopRight', fontSize: 10, fill: DAM_CRITICAL_LINE_COLOR }}
                    />
                )}
                <Line
                    dataKey='level'
                    type='monotone'
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                />
                {chartData
                    .filter((d) => d.spilling)
                    .map((d) => (
                        <ReferenceDot
                            key={d.t}
                            x={d.t}
                            y={d.level}
                            r={4}
                            fill={DAM_CRITICAL_LINE_COLOR}
                            stroke='var(--background)'
                            strokeWidth={1.5}
                        />
                    ))}
            </LineChart>
        </ChartContainer>
    )
}

export default DamTrendChart
