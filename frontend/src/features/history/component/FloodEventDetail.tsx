import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, BadgeCheck, CheckCircle2, Pencil } from 'lucide-react'
import NotFound from '@/common/pages/NotFound'
import ErrorState from '@/common/components/ErrorState'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import { Card, CardContent, CardTitle } from '@/common/ui/card'
import { Map } from '@/common/ui/map'
import { Separator } from '@/common/ui/separator'
import { CATEGORY_LABELS } from '@/features/gis/constants/risk'
import { useAuth } from '@/features/auth/context/useAuth'
import { useFloodEvent } from '../hooks/useFloodEvent'
import { useConfirmFloodEvent } from '../hooks/useFloodEventActions'
import FloodEventForm from './FloodEventForm'
import ChangeHistoryModal from './ChangeHistoryModal'
import DeleteEventDialog from './DeleteEventDialog'
import ResolveDialog from './ResolveDialog'
import EvidenceReports from './EvidenceReports'
import {
    SEVERITY_COLORS,
    SEVERITY_LABELS,
    SOURCE_KIND_LABELS,
    SOURCE_TYPE_LABELS,
} from '../constants/floodEvents'
import type { FloodEventDetail as FloodEventDetailType } from '../types/api'

/** Small labelled stat card, matching the dashboard's summary tiles. */
const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <Card size='sm'>
        <h5 className='text-xs font-semibold uppercase text-black/50'>{label}</h5>
        <h1 className='text-lg font-semibold'>{value}</h1>
        {sub && <p className='text-xs text-black/50'>{sub}</p>}
    </Card>
)

/** Duration tile, or — when unresolved — a quick-resolve affordance for operators. */
const DurationCard = ({
    event,
    isOperator,
}: {
    event: FloodEventDetailType
    isOperator: boolean
}) => {
    const occurred = new Date(event.occurred_at)

    if (event.is_resolved) {
        return (
            <Stat
                label='Duration'
                value={event.duration_hours != null ? `${event.duration_hours.toFixed(1)} hours` : '—'}
                sub={
                    event.ended_at
                        ? `${format(occurred, 'HH:mm')} – ${format(new Date(event.ended_at), 'HH:mm')}`
                        : 'Recession time not recorded'
                }
            />
        )
    }

    return (
        <Card size='sm' className='justify-between border-amber-500/30 bg-amber-50/40'>
            <div>
                <h5 className='text-xs font-semibold uppercase text-black/50'>Duration</h5>
                <h1 className='text-lg font-semibold text-amber-700'>Ongoing</h1>
                <p className='text-xs text-black/50'>Recession time not recorded</p>
            </div>
            {isOperator && (
                <ResolveDialog
                    eventId={event.id}
                    occurredAt={event.occurred_at}
                    trigger={
                        <Button size='xs' variant='outline' className='mt-2 cursor-pointer'>
                            <CheckCircle2 className='size-3.5' />
                            Resolve
                        </Button>
                    }
                />
            )}
        </Card>
    )
}

/** Confirmation status pill; unconfirmed auto-drafts get a Confirm action for operators. */
const ConfirmationBadge = ({
    event,
    isOperator,
}: {
    event: FloodEventDetailType
    isOperator: boolean
}) => {
    const confirm = useConfirmFloodEvent()

    if (event.is_confirmed) {
        return (
            <Badge variant='outline' className='gap-1 border-emerald-500/40 text-emerald-600'>
                <BadgeCheck className='size-3.5' />
                {event.confirmed_by_name ? `Confirmed by ${event.confirmed_by_name}` : 'Confirmed'}
            </Badge>
        )
    }

    return (
        <span className='flex items-center gap-2'>
            <Badge variant='outline' className='border-amber-500/40 text-amber-600'>
                Unconfirmed · {SOURCE_KIND_LABELS[event.source_kind]}
            </Badge>
            {isOperator && (
                <Button
                    size='xs'
                    variant='outline'
                    className='cursor-pointer'
                    disabled={confirm.isPending}
                    onClick={() => confirm.mutate(event.id)}
                >
                    <BadgeCheck className='size-3.5' />
                    {confirm.isPending ? 'Confirming…' : 'Confirm'}
                </Button>
            )}
        </span>
    )
}

const FloodEventDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { isOperator } = useAuth()

    const numericId = id ? Number(id) : undefined
    const { data: event, isLoading, isError, refetch } = useFloodEvent(numericId)

    if (!id || Number.isNaN(numericId)) return <NotFound />

    if (isLoading) {
        return <div className='p-4 text-black/50'>Loading…</div>
    }
    if (isError || !event) {
        return (
            <ErrorState
                title='Couldn’t load this flood event'
                message='We couldn’t fetch the details for this record. It may have been removed, or the connection dropped.'
                onRetry={() => refetch()}
            />
        )
    }

    const { telemetry } = event
    const occurred = new Date(event.occurred_at)
    const dash = '—'

    return (
        <div className='p-4'>
            <Button size='xs' variant='link' onClick={() => navigate(-1)}>
                <ArrowLeft />
                Back to Flood History
            </Button>

            <div className='flex flex-wrap gap-4 items-center'>
                <h1 className='text-2xl font-semibold'>
                    Flood History: Barangay {event.barangay_name}
                </h1>
                <Badge
                    className='uppercase text-white'
                    style={{ backgroundColor: SEVERITY_COLORS[event.severity] }}
                >
                    {SEVERITY_LABELS[event.severity]}
                </Badge>
                <ConfirmationBadge event={event} isOperator={isOperator} />
                {isOperator && (
                    <div className='ml-auto flex gap-2'>
                        <ChangeHistoryModal eventId={event.id} />
                        <FloodEventForm
                            event={event}
                            trigger={
                                <Button size='sm' variant='outline' className='cursor-pointer'>
                                    <Pencil className='size-4' />
                                    Edit
                                </Button>
                            }
                        />
                        <DeleteEventDialog
                            eventId={event.id}
                            barangayName={event.barangay_name}
                            onDeleted={(deletedId) => navigate(`/history?undo=${deletedId}`)}
                        />
                    </div>
                )}
            </div>
            <p className='text-xs text-black/50'>
                {format(occurred, 'LLLL d, y')} · Event ID #{event.id} ·{' '}
                {SOURCE_TYPE_LABELS[event.source_type]}
                {event.source_type === 'operator'
                    ? event.reported_by_name
                        ? ` — ${event.reported_by_name}`
                        : ''
                    : event.source
                        ? ` — ${event.source}`
                        : ''}
            </p>

            <div className='grid grid-flow-col gap-2 my-4 w-full'>
                <Stat
                    label='Date'
                    value={format(occurred, 'LLL dd, y')}
                    sub={`${format(occurred, 'HH:mm')} onset`}
                />
                <DurationCard event={event} isOperator={isOperator} />
                <Stat
                    label='Flood Depth'
                    value={event.water_depth_m != null ? `${event.water_depth_m} ft` : dash}
                />
                <Stat
                    label='Peak Rainfall'
                    value={
                        telemetry.rainfall != null
                            ? `${telemetry.rainfall.peak_intensity} mm/hr`
                            : dash
                    }
                    sub={
                        telemetry.rainfall != null
                            ? `${telemetry.rainfall.peak_accumulation_24hr} mm / 24h`
                            : 'No reading in window'
                    }
                />
                <Stat
                    label='Peak Dam Level'
                    value={telemetry.dam != null ? `${telemetry.dam.peak_level} m` : dash}
                    sub={telemetry.dam?.is_spilling ? 'Spilling' : 'Pasonanca Dam'}
                />
                <Stat
                    label='Peak Risk'
                    value={
                        telemetry.risk != null
                            ? `${telemetry.risk.peak_score.toFixed(0)} / 100`
                            : dash
                    }
                    sub={telemetry.risk != null ? CATEGORY_LABELS[telemetry.risk.category] : 'No score in window'}
                />
            </div>

            <div className='flex gap-2'>
                <Card className='w-full'>
                    <CardTitle>Flood Summary</CardTitle>
                    <Separator />
                    <CardContent>
                        <p>{event.summary || event.notes || 'No summary recorded.'}</p>
                    </CardContent>
                    <Separator />

                    <CardTitle>Impact Statistics</CardTitle>
                    <Separator />
                    <CardContent className='flex flex-row gap-2'>
                        <Stat
                            label='People Affected'
                            value={event.people_affected != null ? String(event.people_affected) : dash}
                        />
                        <Stat
                            label='People Evacuated'
                            value={event.people_evacuated != null ? String(event.people_evacuated) : dash}
                        />
                    </CardContent>
                </Card>

                <Card className='basis-1/3'>
                    <CardTitle>Response Timeline</CardTitle>
                    <Separator />
                    {event.timeline.length === 0 ? (
                        <p className='text-xs text-black/50'>No timeline recorded.</p>
                    ) : (
                        <div className='flex flex-col gap-8'>
                            {event.timeline.map((entry) => (
                                <div key={entry.id}>
                                    <h5 className='text-sm text-black/50'>
                                        {format(new Date(entry.occurred_at), 'HH:mm')}
                                    </h5>
                                    <h1 className='text-md font-semibold'>{entry.title}</h1>
                                    {entry.description && (
                                        <p className='text-xs text-black/50'>{entry.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className='h-120 w-full'>
                    <CardTitle className='flex flex-row justify-between'>
                        Affected Area
                        <span className='text-xs text-black/50'>
                            Lon: {telemetry.location[0].toFixed(4)} | Lat:{' '}
                            {telemetry.location[1].toFixed(4)}
                        </span>
                    </CardTitle>
                    <Separator />
                    <Map center={telemetry.location} zoom={14} theme='light' />
                </Card>
            </div>

            <EvidenceReports eventId={event.id} />
        </div>
    )
}

export default FloodEventDetail
