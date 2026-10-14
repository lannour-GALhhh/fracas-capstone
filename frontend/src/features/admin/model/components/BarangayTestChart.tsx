import { format } from 'date-fns'
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    ReferenceArea,
    ReferenceLine,
    XAxis,
    YAxis,
} from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/common/ui/chart'
import type { BarangayTestResponse } from '../../types/barangayTest'

const RAIN_COLOR = '#93b4f5'
const SCORE_COLOR = '#dc2626'

const chartConfig = {
    rain: { label: 'Rain (mm/h)', color: RAIN_COLOR },
    score: { label: 'Risk score', color: SCORE_COLOR },
} satisfies ChartConfig

const ts = (iso: string) => new Date(iso).getTime()

/** Hourly rain (bars) and risk score (line); the shaded band is the test window, the dashed line the mark. */
const BarangayTestChart = ({ data }: { data: BarangayTestResponse }) => {
    const points = data.series.map((p) => ({ t: ts(p.time), rain: p.rain_mm, score: p.score }))
    const { mark, window_start, window_end, score_needed } = data.params

    return (
        <ChartContainer config={chartConfig} className='aspect-auto h-72 w-full'>
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: 2, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey='t'
                    type='number'
                    scale='time'
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(t: number) => format(new Date(t), 'MMM d, ha')}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={48}
                />
                <YAxis yAxisId='rain' tickLine={false} axisLine={false} width={32} />
                <YAxis yAxisId='score' orientation='right' domain={[0, 100]} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            labelFormatter={(_, p) => (p?.[0] ? format(new Date(p[0].payload.t), 'MMM d, yyyy ha') : '')}
                        />
                    }
                />
                <ReferenceArea yAxisId='score' x1={ts(window_start)} x2={ts(window_end)} fill='#f59e0b' fillOpacity={0.18} />
                <ReferenceLine yAxisId='score' y={score_needed} stroke={SCORE_COLOR} strokeDasharray='4 4' strokeOpacity={0.5} />
                <ReferenceLine yAxisId='score' x={ts(mark)} stroke='#111827' strokeDasharray='6 3' label={{ value: 'Flood', position: 'insideTopRight', fontSize: 10 }} />
                <Bar yAxisId='rain' dataKey='rain' fill={RAIN_COLOR} isAnimationActive={false} />
                <Line yAxisId='score' dataKey='score' stroke={SCORE_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
        </ChartContainer>
    )
}

export default BarangayTestChart
