import { addDays, format } from 'date-fns'
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis, type DotItemDotProps } from 'recharts'
import { Card } from '@/common/ui/card'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/common/ui/chart'
import ErrorState from '@/common/components/ErrorState'
import { useRainfallForecast } from '../hooks/useRainfallForecast'
import type { ForecastBand, ForecastHour } from '../types/api'

/** The y-axis never tops out below this (mm/hr, the PAGASA orange band), so a drizzle stays a small bump. */
const CHART_FLOOR_MM_HR = 15

const chartConfig = { mm_hr: { label: 'Rainfall', color: 'var(--chart-2)' } } satisfies ChartConfig

/** PAGASA warning colours; `none` uses the chart's own colour. */
const BAND_COLORS: Record<ForecastBand, string> = {
    none: 'var(--chart-2)',
    yellow: '#e0b100',
    orange: '#ee7a1c',
    red: '#d32f2f',
}

const BAND_LABELS: Record<ForecastBand, string> = {
    none: 'Light or no rain',
    yellow: 'Heavy (≥ 7.5 mm/hr)',
    orange: 'Intense (≥ 15 mm/hr)',
    red: 'Torrential (≥ 30 mm/hr)',
}

const when = (h: ForecastHour) => format(new Date(h.start), 'h a, EEE')

const headline = (data: NonNullable<ReturnType<typeof useRainfallForecast>['data']>): string => {
    const { first_heavy: heavy, peak } = data.summary
    if (heavy) return `Heavy rain possible around ${when(heavy)}`
    if (peak && peak.mm_hr >= 2.5) return `Rain possible, peaking around ${when(peak)}`
    return 'No significant rain forecast through tomorrow'
}

/**
 * Rainfall through 11 PM tomorrow as plain intensity bands. Information only: hours 1-4 are covered by the
 * risk score, and everything further out is shown unscored because the forecast is less certain.
 */
const RainfallOutlook = ({ barangayId }: { barangayId: number }) => {
    const { data, isLoading, isError, refetch } = useRainfallForecast(barangayId)

    if (isLoading) return <Card className='gap-1 py-3'><p className='text-muted-foreground text-xs'>Loading…</p></Card>
    if (isError || !data) {
        return (
            <ErrorState
                title='Forecast unavailable'
                message="We couldn't load the rainfall forecast."
                onRetry={() => void refetch()}
            />
        )
    }

    const chartData = data.hours.map((h) => ({
        day: format(new Date(h.start), 'EEE h a'),
        mm_hr: h.mm_hr,
        probability: h.probability,
        band: h.band,
        lead: h.lead_hours,
    }))
    const warnAt = chartData.find((d) => d.lead > data.warning_hours)?.day
    const { peak, total_mm: total } = data.summary
    const today = new Date()

    // Colour each dot by its PAGASA band and fade it by chance of rain.
    const BandDot = ({ cx, cy, payload }: DotItemDotProps) => {
        const d = payload as (typeof chartData)[number]
        if (cx == null || cy == null) return <g />
        return (
            <circle
                cx={cx}
                cy={cy}
                r={3.5}
                fill={BAND_COLORS[d.band]}
                fillOpacity={d.probability == null ? 1 : 0.35 + 0.65 * (d.probability / 100)}
                stroke='var(--background)'
                strokeWidth={1}
            />
        )
    }

    return (
        <Card className='gap-3 py-3'>
            <div className='flex flex-wrap items-baseline justify-start gap-x-4'>
                                <span className='text-muted-foreground text-xs'>
                    Today, {format(today, 'EEE MMM d')} · Tomorrow, {format(addDays(today, 1), 'EEE MMM d')}
                </span>
            </div>

            <div className='grid grid-cols-4 gap-3'>
                <Card className='col-span-2 items-center justify-center px-4 py-3 text-center'>
                    <p className='text-sm font-medium'>{headline(data)}</p>
                </Card>
                <Card className='justify-start gap-0.5 px-3 py-3'>
                    <span className='text-muted-foreground text-xs'>Rainfall Peak Strength</span>
                    <span className='text-base font-semibold'>{peak ? `${peak.mm_hr} mm/hr` : '—'}</span>
                    {peak ? <span className='text-muted-foreground text-xs'>{when(peak)}</span> : null}
                </Card>
                <Card className='justify-start gap-0.5 px-3 py-3'>
                    <span className='text-muted-foreground text-xs'>Total Estimated Rainfall</span>
                    <span className='text-base font-semibold'>{total} mm</span>
                </Card>
            </div>

            <ChartContainer config={chartConfig} className='aspect-auto h-56 w-full'>
                <LineChart accessibilityLayer data={chartData} margin={{ top: 8, left: 2, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey='day'
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        interval={3}
                        tickFormatter={(v: string) => (v.endsWith('12 AM') ? v : v.split(' ').slice(1).join(' '))}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={32}
                        domain={[0, (dataMax: number) => Math.max(dataMax, CHART_FLOOR_MM_HR)]}
                    />
                    {warnAt ? (
                        <ReferenceLine
                            x={warnAt}
                            stroke='var(--muted-foreground)'
                            strokeDasharray='4 3'
                        />
                    ) : null}
                    <ChartTooltip
                        cursor={false}
                        content={({ active, payload }) => {
                            const d = payload?.[0]?.payload as (typeof chartData)[number] | undefined
                            if (!active || !d) return null
                            return (
                                <div className='bg-background rounded-md border px-2.5 py-1.5 text-xs shadow'>
                                    <div className='font-medium'>{d.day}</div>
                                    <div>{d.mm_hr} mm/hr</div>
                                    {d.probability != null ? (
                                        <div className='text-muted-foreground'>{d.probability}% chance of rain</div>
                                    ) : null}
                                </div>
                            )
                        }}
                    />
                    <Line
                        dataKey='mm_hr'
                        type='monotone'
                        stroke='var(--chart-2)'
                        strokeWidth={1.5}
                        dot={BandDot}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ChartContainer>

            <div className='flex flex-wrap gap-x-4 gap-y-1'>
                {(Object.keys(BAND_COLORS) as ForecastBand[]).map((band) => (
                    <span key={band} className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                        <span className='size-2.5 rounded-full' style={{ backgroundColor: BAND_COLORS[band] }} />
                        {BAND_LABELS[band]}
                    </span>
                ))}
            </div>
        </Card>
    )
}

export default RainfallOutlook
