import { useState } from 'react'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon, ImageOff, MapPin } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import { Calendar } from '@/common/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/common/ui/popover'
import { Skeleton } from '@/common/ui/skeleton'
import ErrorState from '@/common/components/ErrorState'
import { cn } from '@/common/utils/utils'
import { useFloodReportQueue } from './hooks'
import ReviewDialog from './ReviewDialog'
import { GRID_SIZES, STATUS_META, STATUS_ORDER, type GridSize } from './constants'
import type { FloodReport, ReportStatus } from './types'

const PAGE_SIZE = 25

/** Local Date → `YYYY-MM-DD`. */
const toDay = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const StatusTag = ({ status }: { status: ReportStatus }) => {
    const { label, icon: Icon, tag } = STATUS_META[status]
    return (
        <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shadow', tag)}>
            <Icon className='size-3' />
            {label}
        </span>
    )
}

/** One photo tile; tags overlay the image, newest-sent first. */
const PhotoTile = ({ report, src, onOpen }: { report: FloodReport; src: string; onOpen: () => void }) => (
    <button
        type='button'
        onClick={onOpen}
        className='group relative aspect-square cursor-pointer overflow-hidden rounded-md border bg-muted'
    >
        <img
            src={src}
            alt={report.description || 'Flood report'}
            loading='lazy'
            className='size-full object-cover transition-transform group-hover:scale-105'
        />
        <div className='absolute left-2 top-2'>
            <StatusTag status={report.status} />
        </div>
        <div className='absolute inset-x-0 bottom-0 flex flex-col items-start gap-0.5 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 text-left text-white'>
            <span className='flex items-center gap-1 text-xs font-medium'>
                <MapPin className='size-3' />
                {report.barangay_name ?? 'Unknown'}
            </span>
            <span className='text-[11px] text-white/80'>Sent {format(new Date(report.created_at), 'LLL d, y · HH:mm')}</span>
        </div>
    </button>
)

const EmptyState = ({ status }: { status: ReportStatus | 'all' }) => {
    const Icon = status === 'all' ? ImageOff : STATUS_META[status].icon
    const label = status === 'all' ? 'reports' : `${STATUS_META[status].label.toLowerCase()} reports`
    return (
        <div className='text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3'>
            <Icon className='size-40 stroke-[0.75] opacity-30' />
            <p className='text-lg font-medium'>No {label}</p>
            <p className='text-sm'>Nothing matches the current filters.</p>
        </div>
    )
}

const ReportsPage = () => {
    const [status, setStatus] = useState<ReportStatus | 'all'>('pending')
    const [range, setRange] = useState<DateRange | undefined>()
    const [size, setSize] = useState<GridSize>('medium')
    const [page, setPage] = useState(1)
    const [selected, setSelected] = useState<FloodReport | null>(null)

    const { data, isLoading, isError, refetch } = useFloodReportQueue({
        ...(status !== 'all' && { status }),
        ...(range?.from && { sent_after: toDay(range.from) }),
        ...(range?.to && { sent_before: toDay(range.to) }),
        page,
    })

    const reports = data?.results ?? []
    // Every photo, flattened; the API already returns reports newest-sent first.
    const photos = reports.flatMap((report) => report.images.map((img) => ({ report, img })))
    const count = data?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

    const rangeLabel =
        range?.from && range?.to
            ? `${format(range.from, 'LLL d')} – ${format(range.to, 'LLL d, y')}`
            : range?.from
                ? `From ${format(range.from, 'LLL d, y')}`
                : 'Any date'
    const gridClass = GRID_SIZES.find((g) => g.value === size)!.className

    return (
        <div className='flex min-h-[calc(100vh-5rem)] w-full flex-col p-4'>
            <h1 className='text-2xl font-semibold'>Reports</h1>

            <Card size='sm' className='my-4 flex flex-row flex-wrap items-center gap-2'>
                <div className='flex gap-1'>
                    {(['all', ...STATUS_ORDER] as const).map((value) => {
                        const Icon = value === 'all' ? null : STATUS_META[value].icon
                        return (
                            <Button
                                key={value}
                                size='sm'
                                variant={status === value ? 'default' : 'outline'}
                                className='cursor-pointer'
                                onClick={() => {
                                    setStatus(value)
                                    setPage(1)
                                }}
                            >
                                {Icon && <Icon className='size-4' />}
                                {value === 'all' ? 'All' : STATUS_META[value].label}
                            </Button>
                        )
                    })}
                </div>

                <Popover>
                    <PopoverTrigger
                        render={
                            <Button
                                variant='outline'
                                className={cn('w-56 justify-start text-left font-normal', !range && 'text-black/50')}
                            >
                                <CalendarIcon className='size-4' />
                                {rangeLabel}
                            </Button>
                        }
                    />
                    <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                            mode='range'
                            selected={range}
                            onSelect={(r) => {
                                setRange(r)
                                setPage(1)
                            }}
                            autoFocus
                        />
                    </PopoverContent>
                </Popover>

                {range && (
                    <Button
                        size='sm'
                        variant='ghost'
                        className='cursor-pointer text-black/50'
                        onClick={() => {
                            setRange(undefined)
                            setPage(1)
                        }}
                    >
                        Clear
                    </Button>
                )}

                <div className='ml-auto flex items-center gap-1' role='group' aria-label='Grid size'>
                    {GRID_SIZES.map((g) => (
                        <Button
                            key={g.value}
                            size='sm'
                            variant={size === g.value ? 'default' : 'outline'}
                            className='w-8 cursor-pointer'
                            aria-label={`${g.value} grid`}
                            onClick={() => setSize(g.value)}
                        >
                            {g.label}
                        </Button>
                    ))}
                </div>
            </Card>

            {isError ? (
                <ErrorState message='We couldn’t load the reports.' onRetry={() => refetch()} />
            ) : isLoading ? (
                <div className={cn('grid gap-3', gridClass)}>
                    {Array.from({ length: 8 }, (_, i) => (
                        <Skeleton key={i} className='aspect-square' />
                    ))}
                </div>
            ) : photos.length === 0 ? (
                <EmptyState status={status} />
            ) : (
                <div className={cn('grid gap-3', gridClass)}>
                    {photos.map(({ report, img }) => (
                        <PhotoTile key={img.id} report={report} src={img.image} onOpen={() => setSelected(report)} />
                    ))}
                </div>
            )}

            {count > PAGE_SIZE && (
                <div className='mt-4 flex items-center justify-center gap-3'>
                    <Button size='sm' variant='outline' disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        Previous
                    </Button>
                    <span className='text-sm text-black/50'>
                        Page {page} of {totalPages}
                    </span>
                    <Button size='sm' variant='outline' disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        Next
                    </Button>
                </div>
            )}

            {selected && <ReviewDialog key={selected.id} report={selected} onClose={() => setSelected(null)} />}
        </div>
    )
}

export default ReportsPage
