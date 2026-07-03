import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import NotFound from '@/common/pages/NotFound'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import { Card, CardContent, CardTitle } from '@/common/ui/card'
import { Map } from '@/common/ui/map'
import { Separator } from '@/common/ui/separator'
import { CATEGORY_LABELS } from '@/features/gis/constants/risk'
import { useFloodEvent } from '../hooks/useFloodEvent'
import { SEVERITY_COLORS, SEVERITY_LABELS } from '../constants/floodEvents'

/** Small labelled stat card, matching the dashboard's summary tiles. */
const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <Card size='sm'>
        <h5 className='text-xs font-semibold uppercase text-black/50'>{label}</h5>
        <h1 className='text-lg font-semibold'>{value}</h1>
        {sub && <p className='text-xs text-black/50'>{sub}</p>}
    </Card>
)

const FloodEventDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()

    const numericId = id ? Number(id) : undefined
    const { data: event, isLoading, isError } = useFloodEvent(numericId)

    if (!id || Number.isNaN(numericId)) return <NotFound />

    if (isLoading) {
        return <div className='p-4 text-black/50'>Loading…</div>
    }
    if (isError || !event) {
        return <div className='p-4 text-destructive'>Couldn&apos;t load this flood event.</div>
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

            <div className='flex gap-4 items-center'>
                <h1 className='text-2xl font-semibold'>
                    Flood History: Barangay {event.barangay_name}
                </h1>
                <Badge
                    className='uppercase text-white'
                    style={{ backgroundColor: SEVERITY_COLORS[event.severity] }}
                >
                    {SEVERITY_LABELS[event.severity]}
                </Badge>
            </div>
            <p className='text-xs text-black/50'>
                {format(occurred, 'LLLL d, y')} · Event ID #{event.id}
            </p>

            <div className='grid grid-flow-col gap-2 my-4 w-full'>
                <Stat
                    label='Date'
                    value={format(occurred, 'LLL dd, y')}
                    sub={`${format(occurred, 'HH:mm')} onset`}
                />
                <Stat
                    label='Duration'
                    value={event.duration_hours != null ? `${event.duration_hours.toFixed(1)} hours` : dash}
                    sub={
                        event.ended_at
                            ? `${format(occurred, 'HH:mm')} – ${format(new Date(event.ended_at), 'HH:mm')}`
                            : 'Recession time not recorded'
                    }
                />
                <Stat
                    label='Water Depth'
                    value={event.water_depth_m != null ? `${event.water_depth_m} m` : dash}
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
        </div>
    )
}

export default FloodEventDetail
