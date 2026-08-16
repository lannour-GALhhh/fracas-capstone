import { useMemo, useState } from 'react'
import { format, formatDistanceStrict } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/common/ui/table'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import { Calendar } from '@/common/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/common/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/common/ui/select'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/common/ui/pagination'
import { cn } from '@/common/utils/utils'
import ErrorState from '@/common/components/ErrorState'
import { getPageItems } from '@/common/utils/pageItems'
import { useBarangays } from '@/features/gis/hooks/useBarangays'
import { useEvacuationHistory } from '../hooks/useEvacuationHistory'
import { TRIGGER_LABELS } from '../constants/evacuation'
import EvacProgress from './EvacProgress'
import type { EvacuationHistoryEntry, EvacuationTrigger } from '../types/api'

const PAGE_SIZE = 25
const COLS = 6

const TRIGGER_FILTERS: EvacuationTrigger[] = ['automated', 'operator']

/** Local Date → `YYYY-MM-DD` (the format the archive filter expects). */
const toDay = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Frozen counts as a bar plus an "n of m" readout. Counts are null on a record
 * closed without a freeze, which must read as "not recorded" rather than zero.
 */
const OutcomeCell = ({ evac }: { evac: EvacuationHistoryEntry }) => {
    const { final_roster: roster, final_safe: safe } = evac
    if (roster == null || safe == null) {
        return <span className='text-black/40'>Not recorded</span>
    }
    const pct = roster > 0 ? Math.round((safe / roster) * 100) : 0
    return (
        <div className='flex min-w-40 flex-col gap-1'>
            <span className='text-xs tabular-nums'>
                {safe.toLocaleString()} of {roster.toLocaleString()} evacuated
                <span className='text-black/50'> · {pct}%</span>
            </span>
            <EvacProgress
                roster={roster}
                safe={safe}
                moving={evac.final_moving ?? 0}
                unaccounted={evac.final_unaccounted ?? 0}
            />
        </div>
    )
}

/**
 * The archive of closed evacuations: when each one ran, what triggered it,
 * who declared it, and the roster outcome frozen when it was marked safe. Filterable by
 * barangay, trigger, and the date the evacuation closed.
 */
const EvacuationHistoryTable = () => {
    const [page, setPage] = useState(1)
    const [barangayId, setBarangayId] = useState<number | undefined>()
    const [trigger, setTrigger] = useState<EvacuationTrigger | 'all'>('all')
    const [range, setRange] = useState<DateRange | undefined>()

    const { data: barangays } = useBarangays()
    const barangayOptions = useMemo(
        () =>
            (barangays?.features ?? [])
                .map((f) => ({ id: f.properties.id, name: f.properties.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [barangays],
    )
    const barangayName = barangayOptions.find((o) => o.id === barangayId)?.name

    // Any filter change resets to the first page (adjust-during-render).
    const filterKey = `${barangayId}|${trigger}|${range?.from}|${range?.to}`
    const [lastKey, setLastKey] = useState(filterKey)
    if (filterKey !== lastKey) {
        setLastKey(filterKey)
        setPage(1)
    }

    const hasFilters = barangayId != null || trigger !== 'all' || range != null
    const clearFilters = () => {
        setBarangayId(undefined)
        setTrigger('all')
        setRange(undefined)
    }

    const rangeLabel =
        range?.from && range?.to
            ? `${format(range.from, 'LLL d')} – ${format(range.to, 'LLL d, y')}`
            : range?.from
                ? `From ${format(range.from, 'LLL d, y')}`
                : 'Any date'

    const { data, isLoading, isError, refetch } = useEvacuationHistory({
        page,
        ...(barangayId && { barangay: barangayId }),
        ...(trigger !== 'all' && { trigger }),
        ...(range?.from && { closed_after: toDay(range.from) }),
        ...(range?.to && { closed_before: toDay(range.to) }),
    })

    const rows = data?.results ?? []
    const count = data?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
    const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const end = Math.min(page * PAGE_SIZE, count)
    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages))

    return (
        <>
            <Card size='sm' className='my-4 flex flex-row items-center gap-2'>
                <Select
                    value={barangayId ? String(barangayId) : 'all'}
                    onValueChange={(v) =>
                        setBarangayId(v === 'all' ? undefined : Number(v as string))
                    }
                >
                    <SelectTrigger className='w-56'>
                        <SelectValue>
                            {(v) =>
                                v === 'all' ? 'All barangays' : (barangayName ?? `Barangay #${v}`)
                            }
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className='max-h-72' alignItemWithTrigger={true}>
                        <SelectItem value='all'>All barangays</SelectItem>
                        {barangayOptions.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                                {o.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={trigger}
                    onValueChange={(v) => setTrigger(v as EvacuationTrigger | 'all')}
                >
                    <SelectTrigger className='w-44'>
                        <SelectValue>
                            {(v) =>
                                v === 'all'
                                    ? 'All triggers'
                                    : TRIGGER_LABELS[v as EvacuationTrigger]
                            }
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='all'>All triggers</SelectItem>
                        {TRIGGER_FILTERS.map((t) => (
                            <SelectItem key={t} value={t}>
                                {TRIGGER_LABELS[t]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Popover>
                    <PopoverTrigger
                        render={
                            <Button
                                variant='outline'
                                className={cn(
                                    'w-56 justify-start text-left font-normal',
                                    !range && 'text-black/50',
                                )}
                            >
                                <CalendarIcon className='size-4' />
                                {rangeLabel}
                            </Button>
                        }
                    />
                    <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar mode='range' selected={range} onSelect={setRange} autoFocus />
                    </PopoverContent>
                </Popover>

                {hasFilters && (
                    <Button
                        size='sm'
                        variant='ghost'
                        className='cursor-pointer text-black/50'
                        onClick={clearFilters}
                    >
                        Clear
                    </Button>
                )}
            </Card>

            <Table className='border-border rounded border'>
                <TableHeader className='bg-accent'>
                    <TableRow>
                        <TableHead>Closed</TableHead>
                        <TableHead>Barangay</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Declared by</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Outcome</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && (
                        <TableRow>
                            <TableCell colSpan={COLS} className='text-black/50'>
                                Loading…
                            </TableCell>
                        </TableRow>
                    )}
                    {isError && (
                        <TableRow>
                            <TableCell colSpan={COLS}>
                                <ErrorState
                                    variant='inline'
                                    title='Couldn’t load evacuation history'
                                    message='The past evacuation records didn’t load. This is usually a brief connection issue.'
                                    onRetry={() => refetch()}
                                />
                            </TableCell>
                        </TableRow>
                    )}
                    {!isLoading && !isError && rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={COLS} className='text-black/50'>
                                {hasFilters
                                    ? 'No past evacuations match these filters.'
                                    : 'No evacuations have been marked safe yet.'}
                            </TableCell>
                        </TableRow>
                    )}
                    {rows.map((e) => (
                        <TableRow key={e.id}>
                            <TableCell
                                className='whitespace-nowrap'
                                title={new Date(e.closed_at).toLocaleString()}
                            >
                                {format(new Date(e.closed_at), 'LLL dd, y')}
                                <span className='block text-xs text-black/50'>
                                    {format(new Date(e.closed_at), 'p')}
                                </span>
                            </TableCell>
                            <TableCell className='font-medium'>{e.barangay.name}</TableCell>
                            <TableCell>
                                <Badge variant='secondary'>{TRIGGER_LABELS[e.trigger]}</Badge>
                            </TableCell>
                            <TableCell className='text-black/60'>
                                {e.triggered_by_name ?? 'System'}
                            </TableCell>
                            <TableCell
                                className='whitespace-nowrap tabular-nums'
                                title={`Declared ${new Date(e.opened_at).toLocaleString()}`}
                            >
                                {e.duration_seconds == null
                                    ? '—'
                                    : formatDistanceStrict(
                                          new Date(e.opened_at),
                                          new Date(e.closed_at),
                                      )}
                            </TableCell>
                            <TableCell>
                                <OutcomeCell evac={e} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2}>
                            <span className='text-sm font-light'>
                                {count === 0
                                    ? 'No records'
                                    : `Showing ${start}-${end} of ${count} record${count === 1 ? '' : 's'}`}
                            </span>
                        </TableCell>
                        <TableCell colSpan={COLS - 2}>
                            <Pagination>
                                <PaginationContent className='ml-auto'>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            className={cn(
                                                page === 1 && 'pointer-events-none opacity-50',
                                            )}
                                            onClick={() => goTo(page - 1)}
                                        />
                                    </PaginationItem>
                                    {getPageItems(page, totalPages).map((item, i) =>
                                        item === 'ellipsis' ? (
                                            <PaginationItem key={`e${i}`}>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        ) : (
                                            <PaginationItem key={item}>
                                                <PaginationLink
                                                    isActive={item === page}
                                                    onClick={() => goTo(item)}
                                                >
                                                    {item}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ),
                                    )}
                                    <PaginationItem>
                                        <PaginationNext
                                            className={cn(
                                                page === totalPages &&
                                                    'pointer-events-none opacity-50',
                                            )}
                                            onClick={() => goTo(page + 1)}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </>
    )
}

export default EvacuationHistoryTable
