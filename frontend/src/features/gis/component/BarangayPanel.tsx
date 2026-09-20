import {
    AlertTriangle,
    BarChart3,
    ChevronsRight,
    CloudRain,
    History,
    LayoutGrid,
    TrendingUp,
    X,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/common/ui/card'
import { Label } from '@/common/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/common/ui/dialog'
import { useAuth } from '@/features/auth/context/useAuth'
import QuickAlertDialog from '@/features/alerts/component/QuickAlertDialog'
import PingEvacuationDialog from '@/features/evacuation/component/PingEvacuationDialog'
import { EvacuationPingIcon } from '@/features/evacuation/component/EvacuationPingIcon'
import { useActiveEvacuations } from '@/features/evacuation/hooks/useActiveEvacuations'
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/common/ui/chart'
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis, type DotItemDotProps } from 'recharts'
import { useBarangayRisk } from '../hooks/useBarangayRisk'
import { useRainfallHistory } from '../hooks/useRainfallHistory'
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, RISK_COLORS, RISK_TEXT_COLORS } from '../constants/risk'
import {
    RAINFALL_CHART_FLOOR_MM_HR,
    RAINFALL_TIER_LABELS,
    rainfallStrengthIndicator,
    rainfallTier,
} from '../constants/rainfall'
import { SUSCEPTIBILITY_COLORS, SUSCEPTIBILITY_LABELS } from '../constants/susceptibility'
import type { BarangayRisk, ZoneScore } from '../types/api'
import { Button } from '@/common/ui/button'
import LoadingCard from '@/common/components/LoadingCard'
import ErrorState from '@/common/components/ErrorState'
import SidePanel from './SidePanel'
import RainfallAccumulation from './RainfallAccumulation'
import RainfallIcon from './RainfallIcon'

const chartConfig = {
    rainfall: { label: 'Rainfall', color: 'var(--chart-2)' },
} satisfies ChartConfig

/** Format a nullable number, dropping noise digits. */
const fmt = (v: number | null | undefined): string =>
    v == null ? '—' : `${Math.round(v * 10) / 10}`

/** A square icon button used for the panel's hide/close affordances. */
const HeaderButton = ({
    onClick,
    label,
    children,
}: {
    onClick: () => void
    label: string
    children: React.ReactNode
}) => (
    <button
        type='button'
        onClick={onClick}
        aria-label={label}
        title={label}
        className='text-muted-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md transition-colors'
    >
        {children}
    </button>
)

/** One half of the rainfall card: a label over a large value, optionally
 * flagging that the forecast trends above the current reading. */
const RainfallStat = ({
    label,
    value,
    rising,
}: {
    label: string
    value: string
    rising?: boolean
}) => (
    <div className='flex flex-1 flex-col gap-1'>
        <span className='text-muted-foreground text-xs'>{label}</span>
        <div className='flex items-baseline gap-1'>
            <span className='text-2xl font-semibold tabular-nums'>{value}</span>
            <span className='text-muted-foreground text-xs'>mm/hr</span>
            {rising && <TrendingUp className='text-amber-500 size-3.5' />}
        </div>
    </div>
)

const HazardHero = ({ data, action }: { data: BarangayRisk; action?: React.ReactNode }) => {
    const category = data.status
    const score = data.risk_score

    return (
        <Card className='gap-3'>
            <div className='flex items-start justify-between gap-2'>
                <Label className='font-medium'>Flood Risk Analysis</Label>
                <div className='flex items-center gap-2'>
                    {data.is_degraded && (
                        <span
                            className='text-destructive flex items-center gap-1 text-xs font-medium'
                            title='Some inputs were stale; weights were redistributed.'
                        >
                            <AlertTriangle className='size-3.5 shrink-0' />
                            Data Outdated
                        </span>
                    )}
                    {action}
                </div>
            </div>

            <div className='flex flex-col items-center gap-1.5 py-1.5 text-center'>
                <span
                    className='text-3xl font-bold uppercase tracking-wide'
                    style={{ color: category ? RISK_TEXT_COLORS[category] : undefined }}
                >
                    {category ? CATEGORY_LABELS[category] : 'No data'}
                </span>
                <p className='text-muted-foreground max-w-[85%] text-xs'>
                    {category
                        ? CATEGORY_DESCRIPTIONS[category]
                        : 'Risk level unavailable — no recent score for this barangay.'}
                </p>
            </div>

            <div className='flex items-center justify-between border-t pt-2 text-xs'>
                <span className='text-muted-foreground'>Hazard score</span>
                <span className='font-semibold tabular-nums'>
                    {score == null ? '—' : Math.round(score)} / 100
                </span>
            </div>
        </Card>
    )
}

const Conditions = ({ data, action }: { data: BarangayRisk; action?: React.ReactNode }) => {
    const forecasts = [
        data.rainfall_forecast_15min,
        data.rainfall_forecast_30min,
        data.rainfall_forecast_45min,
        data.rainfall_forecast_60min,
        data.rainfall_forecast_75min,
        data.rainfall_forecast_90min,
        data.rainfall_forecast_105min,
        data.rainfall_forecast_120min,
        data.rainfall_forecast_135min,
        data.rainfall_forecast_150min,
        data.rainfall_forecast_165min,
        data.rainfall_forecast_180min,
        data.rainfall_forecast_195min,
        data.rainfall_forecast_210min,
        data.rainfall_forecast_225min,
        data.rainfall_forecast_240min,
    ].filter((v): v is number => v != null)
    const peak = forecasts.length ? Math.max(...forecasts) : null
    const rising = peak != null && data.current_rainfall != null && peak > data.current_rainfall
    const strength = rainfallTier(data.current_rainfall)

    return (
        <Card className='gap-3'>
            <div className='flex items-start justify-between gap-2'>
                <div className='flex items-center gap-1.5'>
                    <CloudRain className='text-muted-foreground size-4' />
                    <Label className='font-medium'>Rainfall</Label>
                </div>
                {action}
            </div>
            <div className='flex items-stretch'>
                <RainfallStat label='Current' value={fmt(data.current_rainfall)} />
                <div className='bg-border mx-3 w-px' />
                <RainfallStat label='Peak forecast · 4 hr' value={fmt(peak)} rising={rising} />
            </div>

            <div className='flex items-center gap-2 border-t pt-2'>
                <RainfallIcon mmPerHour={data.current_rainfall} className='size-6' />
                <div className='flex flex-col'>
                    <span className='text-muted-foreground text-xs'>Rainfall Strength</span>
                    <span className='text-sm font-medium'>{RAINFALL_TIER_LABELS[strength]}</span>
                </div>
            </div>
        </Card>
    )
}

/** One susceptibility zone's localized risk (rainfall × susceptibility). */
const ZoneRow = ({ zone }: { zone: ZoneScore }) => (
    <div className='flex flex-col gap-1'>
        <div className='flex items-center justify-between text-xs'>
            <span className='flex items-center gap-1.5'>
                <span
                    className='aspect-square w-2 rounded-full ring-1 ring-foreground/10'
                    style={{ backgroundColor: SUSCEPTIBILITY_COLORS[zone.level] }}
                />
                <span className='font-medium'>{SUSCEPTIBILITY_LABELS[zone.level]}</span>
                <span className='text-muted-foreground'>{Math.round(zone.share * 100)}% of area</span>
            </span>
            <span
                className='rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums'
                style={{ backgroundColor: RISK_COLORS[zone.category], color: '#3f0a0a' }}
            >
                {Math.round(zone.score)}
            </span>
        </div>
        <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
            <div
                className='h-full rounded-full'
                style={{ width: `${zone.score}%`, backgroundColor: RISK_COLORS[zone.category] }}
            />
        </div>
    </div>
)

/**
 * The rainfall-gated breakdown: rainfall is the trigger, and each susceptibility
 * zone scores `rainfall × susceptibility`. The barangay headline is the average
 * of these zone scores, so a high-susceptibility zone only lights up when it
 * actually rains.
 */
const ZoneBreakdown = ({ data }: { data: BarangayRisk }) => {
    if (!data.zones?.length) return null
    return (
        <Card className='gap-3'>
            <Label className='font-medium'>Zone risk</Label>
            <div className='flex flex-col gap-2.5'>
                {data.zones.map((zone) => (
                    <ZoneRow key={zone.level} zone={zone} />
                ))}
            </div>
            <div className='flex items-center justify-between border-t pt-2 text-xs'>
                <span className='font-medium'>Barangay average</span>
                <span className='font-semibold tabular-nums'>
                    {data.average == null ? '—' : Math.round(data.average)}
                </span>
            </div>
        </Card>
    )
}

const RainfallTrend = ({ data }: { data: BarangayRisk }) => {
    // Anchor the timeline to when the backend fetched this reading, not the
    // viewer's clock — keeps the chart correct regardless of client tz/drift.
    const recordedAt = data.recorded_at ? new Date(data.recorded_at) : new Date()
    const atOffset = (minutes: number) => format(new Date(recordedAt.getTime() + minutes * 60_000), 'h:mm a')

    const chartData = [
        { name: atOffset(0), rainfall: data.current_rainfall },
        { name: atOffset(15), rainfall: data.rainfall_forecast_15min },
        { name: atOffset(30), rainfall: data.rainfall_forecast_30min },
        { name: atOffset(45), rainfall: data.rainfall_forecast_45min },
        { name: atOffset(60), rainfall: data.rainfall_forecast_60min },
        { name: atOffset(75), rainfall: data.rainfall_forecast_75min },
        { name: atOffset(90), rainfall: data.rainfall_forecast_90min },
        { name: atOffset(105), rainfall: data.rainfall_forecast_105min },
        { name: atOffset(120), rainfall: data.rainfall_forecast_120min },
        { name: atOffset(135), rainfall: data.rainfall_forecast_135min },
        { name: atOffset(150), rainfall: data.rainfall_forecast_150min },
        { name: atOffset(165), rainfall: data.rainfall_forecast_165min },
        { name: atOffset(180), rainfall: data.rainfall_forecast_180min },
        { name: atOffset(195), rainfall: data.rainfall_forecast_195min },
        { name: atOffset(210), rainfall: data.rainfall_forecast_210min },
        { name: atOffset(225), rainfall: data.rainfall_forecast_225min },
        { name: atOffset(240), rainfall: data.rainfall_forecast_240min },
    ].filter((d) => d.rainfall != null)

    // The current reading's x-axis label — used to pick it out as "now" on
    // the chart, since it's always the first (0-minute-offset) point.
    const nowLabel = data.current_rainfall != null ? atOffset(0) : undefined

    // The single highest tier reached by this forecast — see rainfallStrengthIndicator.
    const maxRainfall = chartData.reduce((max, d) => Math.max(max, d.rainfall ?? 0), 0)
    const indicator = rainfallStrengthIndicator(maxRainfall)

    const RainfallDot = ({ cx, cy, payload }: DotItemDotProps) => {
        if (cx == null || cy == null) return null
        const isNow = payload?.name === nowLabel
        return <circle cx={cx} cy={cy} r={isNow ? 3.5 : 2.7} fill={isNow ? 'var(--color-foreground)' : 'var(--color-rainfall)'} />
    }

    return (
        <Card className='gap-1 py-3'>
            <div className='flex items-center justify-between'>
                <Label>Rainfall forecast</Label>
                <span className='text-muted-foreground text-xs'>{format(recordedAt, 'MMMM d, yyyy, EEEE')}</span>
            </div>
            {chartData.length > 1 ? (
                <CardContent className='px-0'>
                    <ChartContainer config={chartConfig}>
                        <LineChart accessibilityLayer data={chartData} margin={{ top: 12, left: 2, right: 56 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey='name'
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value: string) => (value === nowLabel ? 'NOW' : value)}
                            />
                            {/* Floor the range at the "light rain" threshold so a jump
                                between e.g. 0 and 0.1 mm/hr — both really "no rain" —
                                doesn't fill the whole chart height. Also floored/ceilinged
                                to keep the tier-boundary reference line below in view. */}
                            <YAxis
                                domain={[0, (dataMax: number) => Math.max(dataMax, RAINFALL_CHART_FLOOR_MM_HR, indicator.at)]}
                                tickLine={false}
                                axisLine={false}
                                width={32}
                                tickFormatter={(v: number) => `${v}`}
                            />
                            {/* Only the highest tier the forecast actually reaches gets a
                                line — see rainfallStrengthIndicator. */}
                            <ReferenceLine
                                y={indicator.at}
                                stroke='var(--color-muted-foreground)'
                                strokeDasharray='4 4'
                                label={{
                                    value: indicator.tier[0].toUpperCase() + indicator.tier.slice(1),
                                    position: 'right',
                                    fontSize: 10,
                                    fill: 'var(--color-muted-foreground)',
                                }}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        formatter={(value, name) => (
                                            <div className='flex w-full items-center justify-between gap-3'>
                                                <span className='text-muted-foreground capitalize'>{name}</span>
                                                <span className='font-mono font-medium tabular-nums'>
                                                    {value} mm/hr
                                                </span>
                                            </div>
                                        )}
                                    />
                                }
                            />
                            <Line
                                dataKey='rainfall'
                                type='natural'
                                stroke='var(--color-rainfall)'
                                strokeWidth={2}
                                dot={RainfallDot}
                                activeDot={{ r: 5.4 }}
                            />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            ) : (
                <p className='text-muted-foreground text-xs'>Forecast data unavailable.</p>
            )}
        </Card>
    )
}

/** Pixel width budgeted per hourly point — wide enough that the chart is a
 * long horizontal strip you scroll through, not squeezed to fit the modal. */
const HISTORY_POINT_WIDTH = 44

/** The barangay's rainfall record for the trailing 7 days, one point per
 * clock hour (peak reading that hour) — a look-back mirror of `RainfallTrend`'s
 * forward-looking forecast line. Wider than its container and horizontally
 * scrollable, opening scrolled to its right edge (the latest reading). */
const RainfallHistory = ({ barangayId }: { barangayId: number }) => {
    const { data, isLoading } = useRainfallHistory(barangayId, 7)
    const scrollRef = useRef<HTMLDivElement>(null)

    const chartData = (data ?? []).map((point) => ({
        name: format(new Date(point.recorded_at), 'MMM d, h a'),
        rainfall: point.peak_mm_hr,
    }))

    // The single highest tier reached in the past week — see rainfallStrengthIndicator.
    const maxRainfall = chartData.reduce((max, d) => Math.max(max, d.rainfall ?? 0), 0)
    const indicator = rainfallStrengthIndicator(maxRainfall)
    const chartWidth = Math.max(chartData.length * HISTORY_POINT_WIDTH, 480)

    useEffect(() => {
        scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth })
    }, [chartData.length])

    return (
        <Card className='h-full gap-1 py-3'>
            <Label>7-day rainfall record</Label>
            {isLoading ? (
                <p className='text-muted-foreground text-xs'>Loading…</p>
            ) : chartData.length > 1 ? (
                <div ref={scrollRef} className='flex-1 overflow-x-auto'>
                    <div style={{ width: chartWidth }} className='h-full'>
                        <ChartContainer config={chartConfig} className='aspect-auto h-full min-h-72 w-full'>
                            <LineChart accessibilityLayer data={chartData} margin={{ top: 12, left: 2, right: 16 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey='name'
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    interval={3}
                                />
                                <YAxis
                                    domain={[0, (dataMax: number) => Math.max(dataMax, RAINFALL_CHART_FLOOR_MM_HR, indicator.at)]}
                                    tickLine={false}
                                    axisLine={false}
                                    width={32}
                                    tickFormatter={(v: number) => `${v}`}
                                />
                                <ReferenceLine
                                    y={indicator.at}
                                    stroke='var(--color-muted-foreground)'
                                    strokeDasharray='4 4'
                                    label={{
                                        value: indicator.tier[0].toUpperCase() + indicator.tier.slice(1),
                                        position: 'right',
                                        fontSize: 10,
                                        fill: 'var(--color-muted-foreground)',
                                    }}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value) => (
                                                <div className='flex w-full items-center justify-between gap-3'>
                                                    <span className='text-muted-foreground'>Peak</span>
                                                    <span className='font-mono font-medium tabular-nums'>
                                                        {value} mm/hr
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    }
                                />
                                <Line
                                    dataKey='rainfall'
                                    type='natural'
                                    stroke='var(--color-rainfall)'
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4.5 }}
                                />
                            </LineChart>
                        </ChartContainer>
                    </div>
                </div>
            ) : (
                <p className='text-muted-foreground text-xs'>No rainfall recorded in the past week.</p>
            )}
        </Card>
    )
}

/** Opens a modal with the flood risk analysis plus the full per-zone breakdown. */
const ZoneRiskTrigger = ({ data }: { data: BarangayRisk }) => (
    <Dialog>
        <DialogTrigger
            render={
                <Button size='sm' className='gap-1.5 text-xs'>
                    <LayoutGrid className='size-3.5' />
                    Zone risk
                </Button>
            }
        />
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-md'>
            <DialogHeader>
                <DialogTitle>Zone risk — {data.name}</DialogTitle>
            </DialogHeader>
            <div className='flex flex-col gap-3'>
                <HazardHero data={data} />
                <ZoneBreakdown data={data} />
            </div>
        </DialogContent>
    </Dialog>
)

/** Opens a single wide modal: current conditions + the 4-hour forecast trend
 * up top, and the 7-day rainfall record given the full modal width below —
 * its own horizontally scrollable strip, opening scrolled to the latest hour. */
const RainfallDetailsTrigger = ({ data }: { data: BarangayRisk }) => (
    <Dialog>
        <DialogTrigger
            render={
                <Button size='sm' className='gap-1.5 text-xs'>
                    <BarChart3 className='size-3.5' />
                    Details
                </Button>
            }
        />
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-5xl'>
            <DialogHeader>
                <DialogTitle>Rainfall — {data.name}</DialogTitle>
            </DialogHeader>
            <div className='grid grid-cols-1 items-stretch gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)]'>
                <div className='flex flex-col gap-3'>
                    <Conditions data={data} />
                    <RainfallTrend data={data} />
                </div>
                <div className='flex flex-col sm:border-l sm:pl-4'>
                    <RainfallHistory barangayId={data.id} />
                </div>
            </div>
        </DialogContent>
    </Dialog>
)

/** Operator-only actions for the selected barangay: broadcast, audit history,
 * and declaring an evacuation (or a link into one already active). */
const Actions = ({ id, name }: { id: number; name: string }) => {
    const { isOperator } = useAuth()
    const navigate = useNavigate()
    const { data: evacuations } = useActiveEvacuations()

    if (!isOperator) return null

    const underEvacuation = (evacuations ?? []).some((e) => e.barangay.id === id)

    const tileClass = 'h-16 flex-1 flex-col gap-1 rounded-xl text-xs cursor-pointer'

    return (
        <div className='grid grid-cols-3 gap-2'>
            {underEvacuation ? (
                <Button
                    variant='outline'
                    className={`${tileClass} text-destructive`}
                    onClick={() => navigate('/evacuation')}
                >
                    <EvacuationPingIcon className='size-4' />
                    Under evacuation
                </Button>
            ) : (
                <PingEvacuationDialog barangayId={id} barangayName={name} triggerClassName={tileClass} />
            )}
            <QuickAlertDialog barangayId={id} barangayName={name} triggerClassName={tileClass} />
            <Button
                variant='outline'
                className={tileClass}
                onClick={() => navigate(`/alerts?barangay=${id}`)}
            >
                <History className='size-4' />
                Alert history
            </Button>
        </div>
    )
}

const PanelBody = ({ data }: { data: BarangayRisk }) => (
    <div className='flex flex-col gap-3'>
        <HazardHero data={data} action={<ZoneRiskTrigger data={data} />} />
        <Conditions data={data} action={<RainfallDetailsTrigger data={data} />} />
        <RainfallAccumulation data={data} />

        {(data.computed_at || data.recorded_at) && (
            <div className='text-muted-foreground mt-auto flex flex-col gap-0.5 pt-2 text-center text-xs'>
                {data.computed_at && (
                    <span>
                        Scored {formatDistanceToNow(new Date(data.computed_at), { addSuffix: true })}
                    </span>
                )}
                {data.recorded_at && (
                    <span>
                        Rainfall read {formatDistanceToNow(new Date(data.recorded_at), { addSuffix: true })}
                    </span>
                )}
            </div>
        )}
    </div>
)

interface BarangayPanelProps {
    barangayId: number
    onClose: () => void
    /** Hide the panel while keeping the barangay focused on the map. */
    onHide: () => void
}

const BarangayPanel = ({ barangayId, onClose, onHide }: BarangayPanelProps) => {
    const { isOperator } = useAuth()
    const { data, isLoading, isError, refetch } = useBarangayRisk(barangayId)

    return (
        <SidePanel footer={data && isOperator && <Actions id={data.id} name={data.name} />}>
            <div className='flex items-start justify-between h-fit'>
                <h1 className='text-2xl font-medium'>{data?.name ?? 'Barangay'}</h1>
                <div className='flex items-center gap-1'>
                    <HeaderButton onClick={onHide} label='Hide panel'>
                        <ChevronsRight className='size-4' />
                    </HeaderButton>
                    <HeaderButton onClick={onClose} label='Close panel'>
                        <X className='size-4' />
                    </HeaderButton>
                </div>
            </div>

            {isLoading && <LoadingCard />}
            {isError && (
                <ErrorState
                    variant='inline'
                    title='Barangay detail unavailable'
                    message='We couldn’t load this barangay’s risk breakdown. It should be back after a quick retry.'
                    onRetry={() => refetch()}
                />
            )}
            {data && <PanelBody data={data} />}
        </SidePanel>
    )
}

export default BarangayPanel
