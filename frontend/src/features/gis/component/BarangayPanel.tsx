import {
    AlertTriangle,
    ChevronRight,
    ChevronsRight,
    CloudRain,
    History,
    Siren,
    TrendingUp,
    Waves,
    X,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/common/ui/card'
import { Label } from '@/common/ui/label'
import { useAuth } from '@/features/auth/context/useAuth'
import QuickAlertDialog from '@/features/alerts/component/QuickAlertDialog'
import PingEvacuationDialog from '@/features/evacuation/component/PingEvacuationDialog'
import { useActiveEvacuations } from '@/features/evacuation/hooks/useActiveEvacuations'
import { useRecentFloods } from '@/features/history/hooks/useRecentFloods'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '@/features/history/constants/floodEvents'
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/common/ui/chart'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import { useBarangayRisk } from '../hooks/useBarangayRisk'
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, RISK_COLORS, RISK_TEXT_COLORS } from '../constants/risk'
import { SUSCEPTIBILITY_COLORS, SUSCEPTIBILITY_LABELS } from '../constants/susceptibility'
import type { BarangayRisk, ZoneScore } from '../types/api'
import { Button } from '@/common/ui/button'
import LoadingCard from '@/common/components/LoadingCard'
import ErrorState from '@/common/components/ErrorState'
import SidePanel from './SidePanel'

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

const HazardHero = ({ data }: { data: BarangayRisk }) => {
    const category = data.status
    const score = data.risk_score

    return (
        <Card className='gap-3'>
            <Label className='font-medium'>Flood Risk Analysis</Label>

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

            {data.is_degraded && (
                <div className='text-destructive flex items-center gap-1.5 text-xs'>
                    <AlertTriangle className='size-3.5 shrink-0' />
                    <span>Degraded — some inputs were stale; weights were redistributed.</span>
                </div>
            )}

            <div className='flex items-center justify-between border-t pt-2 text-xs'>
                <span className='text-muted-foreground'>Hazard score</span>
                <span className='font-semibold tabular-nums'>
                    {score == null ? '—' : Math.round(score)} / 100
                </span>
            </div>
        </Card>
    )
}

const Conditions = ({ data }: { data: BarangayRisk }) => {
    const forecasts = [
        data.rainfall_forecast_30min,
        data.rainfall_forecast_1hr,
        data.rainfall_forecast_90min,
        data.rainfall_forecast_2hr,
        data.rainfall_forecast_150min,
        data.rainfall_forecast_3hr,
        data.rainfall_forecast_210min,
        data.rainfall_forecast_4hr,
    ].filter((v): v is number => v != null)
    const peak = forecasts.length ? Math.max(...forecasts) : null
    const rising = peak != null && data.current_rainfall != null && peak > data.current_rainfall

    return (
        <Card className='gap-3'>
            <div className='flex items-center gap-1.5'>
                <CloudRain className='text-muted-foreground size-4' />
                <Label className='font-medium'>Rainfall</Label>
            </div>
            <div className='flex items-stretch'>
                <RainfallStat label='Current' value={fmt(data.current_rainfall)} />
                <div className='bg-border mx-3 w-px' />
                <RainfallStat label='Peak forecast · 4 hr' value={fmt(peak)} rising={rising} />
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
    const now = new Date()
    const atOffset = (minutes: number) => format(new Date(now.getTime() + minutes * 60_000), 'h:mm a')

    const chartData = [
        { name: atOffset(0), rainfall: data.current_rainfall },
        { name: atOffset(30), rainfall: data.rainfall_forecast_30min },
        { name: atOffset(60), rainfall: data.rainfall_forecast_1hr },
        { name: atOffset(90), rainfall: data.rainfall_forecast_90min },
        { name: atOffset(120), rainfall: data.rainfall_forecast_2hr },
        { name: atOffset(150), rainfall: data.rainfall_forecast_150min },
        { name: atOffset(180), rainfall: data.rainfall_forecast_3hr },
        { name: atOffset(210), rainfall: data.rainfall_forecast_210min },
        { name: atOffset(240), rainfall: data.rainfall_forecast_4hr },
    ].filter((d) => d.rainfall != null)

    return (
        <Card className='gap-1 py-3'>
            <div className='flex items-center justify-between'>
                <Label>Rainfall forecast</Label>
                <span className='text-muted-foreground text-xs'>{format(now, 'MMMM d, yyyy, EEEE')}</span>
            </div>
            {chartData.length > 1 ? (
                <CardContent className='px-0'>
                    <ChartContainer config={chartConfig}>
                        <LineChart accessibilityLayer data={chartData} margin={{ top: 12, left: 2, right: 12 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey='name' tickLine={false} axisLine={false} tickMargin={8} />
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
                                dot={{ fill: 'var(--color-rainfall)' }}
                                activeDot={{ r: 6 }}
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

/** The barangay's recent flood record (past 7 days, up to 3), newest first. */
const RecentFloods = ({ id }: { id: number }) => {
    const navigate = useNavigate()
    const { data, isLoading } = useRecentFloods(id, 7)
    const floods = (data?.results ?? []).slice(0, 3)

    if (isLoading || floods.length === 0) return null

    return (
        <Card className='gap-2'>
            <div className='flex items-center gap-1.5'>
                <Waves className='text-muted-foreground size-4' />
                <Label className='font-medium'>Recent floods</Label>
                <span className='text-muted-foreground text-xs'>past 7 days</span>
            </div>
            <div className='flex flex-col gap-1'>
                {floods.map((flood) => (
                    <button
                        key={flood.id}
                        type='button'
                        onClick={() => navigate(`/history/${flood.id}`)}
                        className='hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors'
                    >
                        <span className='flex items-center gap-2 text-sm'>
                            <span
                                className='aspect-square w-2 rounded-full ring-1 ring-foreground/10'
                                style={{ backgroundColor: SEVERITY_COLORS[flood.severity] }}
                            />
                            {format(new Date(flood.occurred_at), 'LLL d, HH:mm')}
                            <span className='text-muted-foreground'>
                                {SEVERITY_LABELS[flood.severity]}
                            </span>
                        </span>
                        <ChevronRight className='text-muted-foreground size-4' />
                    </button>
                ))}
            </div>
        </Card>
    )
}

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
                    <Siren className='size-4' />
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
    <div className='h-full'>
        <HazardHero data={data} />
        <Actions id={data.id} name={data.name} />
        <Conditions data={data} />
        <RecentFloods id={data.id} />
        <ZoneBreakdown data={data} />
        <RainfallTrend data={data} />

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
    const { data, isLoading, isError, refetch } = useBarangayRisk(barangayId)

    return (
        <SidePanel className='overflow-y-auto'>
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
