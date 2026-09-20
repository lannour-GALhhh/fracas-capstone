import { BarChart3, CloudRain } from 'lucide-react'
import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardTitle } from '@/common/ui/card'
import { Label } from '@/common/ui/label'
import { Button } from '@/common/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/common/ui/dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/common/ui/chart'
import { useRainfallHistory } from '../hooks/useRainfallHistory'
import type { BarangayRisk } from '../types/api'

const chartConfig = {
    accumulated: { label: 'Accumulated', color: '#0ea5e9' },
} satisfies ChartConfig

/** Round to at most 2 decimal places without padding trailing zeros. */
const fmtMm = (v: number | null | undefined): string =>
    v == null ? '—' : `${Math.round(v * 100) / 100}`

/** Gauge's 100% mark: mirrors the backend's accumulation-curve saturation point. */
const DAILY_MAX_MM = 200
const WEEKLY_MAX_MM = 400

const AccumulationCard = ({
    title,
    valueMm,
    maxMm,
}: {
    title: string
    valueMm: number | null | undefined
    maxMm: number
}) => {
    const pct = valueMm == null ? 0 : Math.min(100, Math.max(0, (valueMm / maxMm) * 100))

    return (
        <Card className='flex-1 items-center gap-2 text-center'>
            <div className='flex items-center gap-2.5'>
                <Label className='font-medium'>{title}</Label>
            </div>
            {/* A cup filling from the bottom: sky blue against the barangay's
                dangerous-level capacity in light gray. */}
            <div className='bg-muted relative h-28 w-10 overflow-hidden rounded-full'>
                <div
                    className='absolute inset-x-0 bottom-0 rounded-full bg-sky-500 transition-[height]'
                    style={{ height: `${pct}%` }}
                />
            </div>
            <span className='text-2xl font-bold tabular-nums'>
                {fmtMm(valueMm)}
                <span className='text-muted-foreground ml-1 text-xs font-normal'>mm</span>
            </span>
        </Card>
    )
}

/** Opens a modal with the past 7 days of accumulated rainfall as a bar graph. */
const AccumulationHistoryTrigger = ({ barangayId }: { barangayId: number }) => {
    const { data, isLoading } = useRainfallHistory(barangayId, 7, 'day')

    const chartData = (data ?? []).map((point) => ({
        // Append a time so the date-only string parses in local time, not UTC.
        date: format(new Date(`${point.recorded_at}T00:00:00`), 'MMM d'),
        accumulated: point.accumulated_mm,
    }))

    return (
        <Dialog>
            <DialogTrigger
                render={
                    <Button size='sm' className='shrink-0 gap-1.5 text-xs'>
                        <BarChart3 className='size-3.5' />
                        Details
                    </Button>
                }
            />
            <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-xl'>
                <DialogHeader>
                    <DialogTitle>7-day rainfall accumulation</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <p className='text-muted-foreground text-xs'>Loading…</p>
                ) : chartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className='aspect-auto h-64 w-full'>
                        <BarChart accessibilityLayer data={chartData} margin={{ top: 12, left: 2, right: 8 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey='date' tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                width={32}
                                tickFormatter={(v: number) => `${v}`}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        formatter={(value) => (
                                            <div className='flex w-full items-center justify-between gap-3'>
                                                <span className='text-muted-foreground'>Accumulated</span>
                                                <span className='font-mono font-medium tabular-nums'>
                                                    {value} mm
                                                </span>
                                            </div>
                                        )}
                                    />
                                }
                            />
                            <Bar dataKey='accumulated' fill='var(--color-accumulated)' radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <p className='text-muted-foreground text-xs'>No rainfall recorded in the past week.</p>
                )}
            </DialogContent>
        </Dialog>
    )
}

interface RainfallAccumulationProps {
    data: BarangayRisk
}

/** Daily and weekly rainfall accumulation, side by side. */
const RainfallAccumulation = ({ data }: RainfallAccumulationProps) => (
    <Card className='flex gap-3'>
        <div className='flex items-center justify-between gap-2'>
            <CardTitle className='flex flex-row items-center gap-2 text-sm'>
                Rainfall Accumulation <CloudRain size={16} opacity={0.5} strokeWidth={3} />
            </CardTitle>
            <AccumulationHistoryTrigger barangayId={data.id} />
        </div>
        <div className='flex flex-row gap-2'>
            <AccumulationCard title='Today' valueMm={data.accumulated_24hr} maxMm={DAILY_MAX_MM} />
            <AccumulationCard title='This Week' valueMm={data.accumulated_7day} maxMm={WEEKLY_MAX_MM} />
        </div>
    </Card>
)

export default RainfallAccumulation
