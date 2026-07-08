import { AlertTriangle, ChevronRight, ChevronsRight, History, Waves, X } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/common/ui/card'
import { Label } from '@/common/ui/label'
import { Progress } from '@/common/ui/progress'
import { Badge } from '@/common/ui/badge'
import { useAuth } from '@/features/auth/context/useAuth'
import QuickAlertDialog from '@/features/alerts/component/QuickAlertDialog'
import { useRecentFloods } from '@/features/history/hooks/useRecentFloods'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '@/features/history/constants/floodEvents'
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/common/ui/chart'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import capitalize from '@/common/utils/capitalize'
import { useBarangayRisk } from '../hooks/useBarangayRisk'
import { CATEGORY_LABELS, RISK_COLORS } from '../constants/risk'
import type { BarangayRisk, RiskFactorBreakdown } from '../types/api'
import { Button } from '@/common/ui/button'
import LoadingCard from '@/common/components/LoadingCard'
import ErrorState from '@/common/components/ErrorState'
import SidePanel from './SidePanel'

const chartConfig = {
    rainfall: { label: 'Rainfall', color: 'var(--chart-2)' },
} satisfies ChartConfig

const FACTOR_LABELS: Record<string, string> = {
    rainfall: 'Rainfall',
    susceptibility: 'Flood susceptibility',
}

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

/** A compact metric readout: label above a large value with an optional unit. */
const StatTile = ({
    label,
    value,
    unit,
}: {
    label: string
    value: string
    unit?: string
}) => (
    <Card size='sm' className='gap-1'>
        <Label className='text-muted-foreground text-xs'>{label}</Label>
        <div className='flex items-baseline gap-1'>
            <span className='text-2xl font-semibold tabular-nums'>{value}</span>
            {unit && <span className='text-muted-foreground text-xs'>{unit}</span>}
        </div>
    </Card>
)

/**
 * One factor's row in the breakdown. Shows its own hazard (0–100) and the
 * *effective* weight it carried this cycle — unavailable factors are dropped
 * and their weight is spread across the rest, so we surface that here.
 */
const FactorRow = ({
    name,
    factor,
    effectiveWeight,
}: {
    name: string
    factor: RiskFactorBreakdown
    effectiveWeight: number
}) => (
    <div className='flex flex-col gap-1.5'>
        <div className='flex items-center justify-between text-xs'>
            <span className='flex items-center gap-2'>
                <span className='font-medium'>{FACTOR_LABELS[name] ?? capitalize(name)}</span>
                <span className='text-muted-foreground'>
                    {factor.available ? `${Math.round(effectiveWeight * 100)}% weight` : 'redistributed'}
                </span>
            </span>
            <span className={factor.available ? 'font-medium tabular-nums' : 'text-muted-foreground'}>
                {factor.available ? Math.round(factor.value * 100) : 'no data'}
            </span>
        </div>
        <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
            <div
                className='bg-foreground/70 h-full rounded-full'
                style={{ width: factor.available ? `${factor.value * 100}%` : 0 }}
            />
        </div>
    </div>
)

const HazardHero = ({ data }: { data: BarangayRisk }) => {
    const category = data.status
    const score = data.risk_score

    return (
        <Card className='gap-3'>
            <div className='flex items-start justify-between'>
                <div className='flex flex-col gap-1'>
                    <Label className='text-muted-foreground text-xs'>Hazard score</Label>
                    <div className='flex items-baseline gap-1.5'>
                        <span className='text-4xl font-bold tabular-nums'>
                            {score == null ? '—' : Math.round(score)}
                        </span>
                        <span className='text-muted-foreground text-sm'>/ 100</span>
                    </div>
                </div>
                <Badge
                    style={
                        category
                            ? { backgroundColor: RISK_COLORS[category], color: '#3f0a0a' }
                            : undefined
                    }
                    variant={category ? 'default' : 'secondary'}
                >
                    {category ? CATEGORY_LABELS[category] : 'No data'}
                </Badge>
            </div>

            <Progress value={score ?? 0} />

            {data.is_degraded && (
                <div className='text-destructive flex items-center gap-1.5 text-xs'>
                    <AlertTriangle className='size-3.5 shrink-0' />
                    <span>Degraded — some inputs were stale; weights were redistributed.</span>
                </div>
            )}
        </Card>
    )
}

const Conditions = ({ data }: { data: BarangayRisk }) => {
    const roc = data.rainfall_rate_change
    const forecasts = [
        data.rainfall_forecast_1hr,
        data.rainfall_forecast_2hr,
        data.rainfall_forecast_3hr,
        data.rainfall_forecast_4hr,
    ].filter((v): v is number => v != null)
    const peak = forecasts.length ? Math.max(...forecasts) : null

    return (
        <div className='grid grid-cols-2 gap-3'>
            <StatTile label='Current rainfall' value={fmt(data.current_rainfall)} unit='mm/hr' />
            <StatTile
                label='Rate of change'
                value={roc == null ? '—' : `${roc > 0 ? '+' : ''}${fmt(roc)}`}
                unit='mm/hr'
            />
            <StatTile label='Peak forecast (4 hr)' value={fmt(peak)} unit='mm/hr' />
            <StatTile label='Accumulated (24 hr)' value={fmt(data.accumulated_24hr)} unit='mm' />
        </div>
    )
}

const Breakdown = ({ breakdown }: { breakdown: Record<string, RiskFactorBreakdown> }) => {
    const entries = Object.entries(breakdown)
    const availableWeight = entries.reduce(
        (sum, [, f]) => sum + (f.available ? f.raw_weight : 0),
        0,
    )

    return (
        <Card className='gap-3'>
            <div>
                <Label className='font-medium'>Why this score</Label>
                <p className='text-muted-foreground text-xs'>Each input scored 0–100, blended by weight.</p>
            </div>
            <div className='flex flex-col gap-3'>
                {entries.map(([name, factor]) => (
                    <FactorRow
                        key={name}
                        name={name}
                        factor={factor}
                        effectiveWeight={availableWeight > 0 ? factor.raw_weight / availableWeight : 0}
                    />
                ))}
            </div>
        </Card>
    )
}

const RainfallTrend = ({ data }: { data: BarangayRisk }) => {
    const chartData = [
        { name: 'Now', rainfall: data.current_rainfall },
        { name: '+1 hr', rainfall: data.rainfall_forecast_1hr },
        { name: '+2 hr', rainfall: data.rainfall_forecast_2hr },
        { name: '+3 hr', rainfall: data.rainfall_forecast_3hr },
        { name: '+4 hr', rainfall: data.rainfall_forecast_4hr },
    ].filter((d) => d.rainfall != null)

    return (
        <Card className='gap-1 py-3'>
            <Label>Rainfall forecast</Label>
            {chartData.length > 1 ? (
                <CardContent className='px-0'>
                    <ChartContainer config={chartConfig}>
                        <LineChart accessibilityLayer data={chartData} margin={{ top: 12, left: 2, right: 12 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey='name' tickLine={false} axisLine={false} tickMargin={8} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
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

/** Operator-only actions for the selected barangay: broadcast + audit history. */
const Actions = ({ id, name }: { id: number; name: string }) => {
    const { isOperator } = useAuth()
    const navigate = useNavigate()

    if (!isOperator) return null

    return (
        <div className='flex gap-2'>
            <QuickAlertDialog barangayId={id} barangayName={name} triggerClassName='flex-1 cursor-pointer' />
            <Button
                variant='outline'
                size='sm'
                className='flex-1 cursor-pointer'
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
        {data.breakdown && <Breakdown breakdown={data.breakdown} />}
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
