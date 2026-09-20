import { format } from 'date-fns'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/common/ui/chart'
import { useModelPerformance } from '../hooks/useAnalytics'
import PanelCard from './PanelCard'

// Recall (%) is the headline axis; mean score is a caption stat instead.
const RECALL_COLOR = '#2563eb'
const chartConfig = { recall: { label: 'Recall', color: RECALL_COLOR } } satisfies ChartConfig

const ModelPerformanceChart = () => {
    const { data, isLoading, isError, refetch } = useModelPerformance()
    const runs = data ?? []

    const chartData = runs.map((r) => ({
        t: new Date(r.created_at).getTime(),
        recall: r.recall != null ? Math.round(r.recall * 100) : null,
    }))
    const latest = runs.at(-1)

    return (
        <PanelCard
            title='Model performance'
            description='Hindcast recall across validation runs'
            action={
                latest?.mean_score != null ? (
                    <span className='text-xs text-muted-foreground'>
                        mean score{' '}
                        <span className='font-medium text-foreground tabular-nums'>
                            {latest.mean_score.toFixed(0)}
                        </span>
                    </span>
                ) : undefined
            }
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            isEmpty={chartData.length === 0}
            emptyMessage='No validation runs recorded yet. Run the validation harness to populate this.'
        >
            <ChartContainer config={chartConfig} className='aspect-auto h-56 w-full'>
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 2, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey='t'
                        type='number'
                        scale='time'
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(t: number) => format(new Date(t), 'MMM d')}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={40}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        width={38}
                        tickFormatter={(v: number) => `${v}%`}
                    />
                    <ChartTooltip
                        content={
                            <ChartTooltipContent
                                labelFormatter={(_, p) =>
                                    p?.[0] ? format(new Date(p[0].payload.t), 'MMM d, yyyy') : ''
                                }
                                formatter={(value) => `${value}% recall`}
                            />
                        }
                    />
                    <Line
                        dataKey='recall'
                        type='monotone'
                        stroke={RECALL_COLOR}
                        strokeWidth={2}
                        dot={{ r: 3, fill: RECALL_COLOR }}
                        activeDot={{ r: 5 }}
                        connectNulls
                    />
                </LineChart>
            </ChartContainer>
        </PanelCard>
    )
}

export default ModelPerformanceChart
