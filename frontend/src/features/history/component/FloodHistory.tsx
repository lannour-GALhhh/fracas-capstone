import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { format } from 'date-fns'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { DateRange } from 'react-day-picker'
import { ArrowRight, CalendarIcon, Plus } from 'lucide-react'
import { useAuth } from '@/features/auth/context/useAuth'
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
import { useFloodEvents } from '../hooks/useFloodEvents'
import { SEVERITY_COLORS, SEVERITY_LABELS, SEVERITY_FILTERS } from '../constants/floodEvents'
import BarangayMultiSelect from './BarangayMultiSelect'
import FloodEventForm from './FloodEventForm'
import UndoDeleteBanner from './UndoDeleteBanner'
import type { FloodSeverity } from '../types/api'

const PAGE_SIZE = 25
const COLS = 6

const SeverityCell = ({ severity }: { severity: FloodSeverity }) => (
    <span className='flex items-center gap-2'>
        <span
            className='aspect-square w-2 rounded-full ring-1 ring-foreground/10'
            style={{ backgroundColor: SEVERITY_COLORS[severity] }}
        />
        {SEVERITY_LABELS[severity]}
    </span>
)

/** `YYYY-MM-DD` string → local Date (or undefined). */
const parseDay = (value: string | null): Date | undefined => {
    if (!value) return undefined
    const [y, m, d] = value.split('-').map(Number)
    return y && m && d ? new Date(y, m - 1, d) : undefined
}

/** Local Date → `YYYY-MM-DD`. */
const toDay = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Classes mirroring {@link TableRow} — applied to the animated `motion.tr` rows. */
const ROW_CLASS =
    'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer'

const FloodHistory = () => {
    const navigate = useNavigate()
    const { isOperator } = useAuth()
    const reduce = useReducedMotion()
    const [page, setPage] = useState(1)

    // All filters are URL-driven so they're shareable and the map panel can deep-link.
    const [searchParams, setSearchParams] = useSearchParams()
    const barangayParam = searchParams.get('barangay')
    const barangayIds = (barangayParam ?? '')
        .split(',')
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
    const severity = (searchParams.get('severity') ?? 'all') as FloodSeverity | 'all'
    const after = searchParams.get('after')
    const before = searchParams.get('before')
    const undoId = searchParams.get('undo')
    const range: DateRange | undefined =
        after || before ? { from: parseDay(after), to: parseDay(before) } : undefined

    const { data: barangays } = useBarangays()
    const barangayOptions = useMemo(
        () =>
            (barangays?.features ?? [])
                .map((f) => ({ id: f.properties.id, name: f.properties.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [barangays],
    )

    // Any filter change resets to the first page (adjust-during-render).
    const filterKey = `${barangayIds.join(',')}|${severity}|${after}|${before}`
    const [lastKey, setLastKey] = useState(filterKey)
    if (filterKey !== lastKey) {
        setLastKey(filterKey)
        setPage(1)
    }

    /** Merge a set of param updates; empty/undefined values are cleared. */
    const patchParams = (updates: Record<string, string | undefined>) => {
        const next = new URLSearchParams(searchParams)
        for (const [key, value] of Object.entries(updates)) {
            if (value) next.set(key, value)
            else next.delete(key)
        }
        setSearchParams(next, { replace: true })
    }

    const onRange = (r: DateRange | undefined) =>
        patchParams({
            after: r?.from ? toDay(r.from) : undefined,
            before: r?.to ? toDay(r.to) : undefined,
        })

    const hasFilters = severity !== 'all' || barangayIds.length > 0 || after != null || before != null
    const rangeLabel =
        range?.from && range?.to
            ? `${format(range.from, 'LLL d')} – ${format(range.to, 'LLL d, y')}`
            : range?.from
                ? `From ${format(range.from, 'LLL d, y')}`
                : 'Any date'

    const filters = {
        page,
        ...(severity !== 'all' && { severity }),
        ...(barangayIds.length > 0 && { barangay: barangayIds.join(',') }),
        ...(after && { occurred_after: after }),
        ...(before && { occurred_before: before }),
    }
    const { data, isLoading, isError, refetch } = useFloodEvents(filters)

    const events = data?.results ?? []
    const count = data?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
    const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const end = Math.min(page * PAGE_SIZE, count)

    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages))

    return (
        <div className='w-full p-4'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-semibold'>Flood History</h1>
                    <p className='text-xs text-black/50'>
                        Recorded flood events and their response.
                    </p>
                </div>
                {isOperator && (
                    <FloodEventForm
                        trigger={
                            <Button size='sm' className='cursor-pointer'>
                                <Plus className='size-4' />
                                New event
                            </Button>
                        }
                    />
                )}
            </div>

            {undoId && (
                <UndoDeleteBanner
                    eventId={Number(undoId)}
                    onDismiss={() => patchParams({ undo: undefined })}
                />
            )}

            <Card size='sm' className='flex flex-row items-center gap-2 my-4'>
                <BarangayMultiSelect
                    options={barangayOptions}
                    value={barangayIds}
                    onConfirm={(ids) => patchParams({ barangay: ids.join(',') || undefined })}
                />

                <Select
                    value={severity}
                    onValueChange={(v) =>
                        patchParams({ severity: v === 'all' ? undefined : (v as string) })
                    }
                >
                    <SelectTrigger className='w-44'>
                        <SelectValue>
                            {(v) =>
                                v === 'all' ? 'All severities' : SEVERITY_LABELS[v as FloodSeverity]
                            }
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='all'>All severities</SelectItem>
                        {SEVERITY_FILTERS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                                {s.label}
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
                        <Calendar mode='range' selected={range} onSelect={onRange} autoFocus />
                    </PopoverContent>
                </Popover>

                {hasFilters && (
                    <Button
                        size='sm'
                        variant='ghost'
                        className='text-black/50 cursor-pointer'
                        onClick={() =>
                            patchParams({
                                barangay: undefined,
                                severity: undefined,
                                after: undefined,
                                before: undefined,
                            })
                        }
                    >
                        Clear
                    </Button>
                )}
            </Card>

            <Table className='border-border border rounded'>
                <TableHeader className='bg-accent'>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Barangay</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Flood Depth</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead></TableHead>
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
                                    title='Couldn’t load flood history'
                                    message='The flood-event records didn’t load. This is usually a brief connection issue.'
                                    onRetry={() => refetch()}
                                />
                            </TableCell>
                        </TableRow>
                    )}
                    {!isLoading && !isError && events.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={COLS} className='text-black/50'>
                                No flood events recorded.
                            </TableCell>
                        </TableRow>
                    )}
                    {events.map((e, i) => (
                        <motion.tr
                            key={e.id}
                            className={ROW_CLASS}
                            initial={reduce ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.24,
                                delay: Math.min(i * 0.03, 0.3),
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            onClick={() => navigate(`/history/${e.id}`)}
                        >
                            <TableCell
                                className='whitespace-nowrap'
                                title={new Date(e.occurred_at).toLocaleString()}
                            >
                                {format(new Date(e.occurred_at), 'LLL dd, y')}
                            </TableCell>
                            <TableCell className='font-medium'>
                                <span className='flex items-center gap-2'>
                                    {e.barangay_name}
                                    {!e.is_confirmed && (
                                        <Badge
                                            variant='outline'
                                            className='border-amber-500/40 text-amber-600'
                                        >
                                            Unconfirmed
                                        </Badge>
                                    )}
                                </span>
                            </TableCell>
                            <TableCell>
                                <SeverityCell severity={e.severity} />
                            </TableCell>
                            <TableCell className='tabular-nums'>
                                {e.water_depth_m != null ? `${e.water_depth_m} ft` : '—'}
                            </TableCell>
                            <TableCell className='text-black/60'>
                                {(e.source_type === 'operator' ? e.reported_by_name : e.source) || '—'}
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant='secondary'
                                    size='xs'
                                    className='cursor-pointer'
                                    onClick={(ev) => {
                                        ev.stopPropagation()
                                        navigate(`/history/${e.id}`)
                                    }}
                                >
                                    View <ArrowRight />
                                </Button>
                            </TableCell>
                        </motion.tr>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2}>
                            <span className='font-light text-sm'>
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
                                            className={cn(page === 1 && 'pointer-events-none opacity-50')}
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
                                                page === totalPages && 'pointer-events-none opacity-50',
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
        </div>
    )
}

export default FloodHistory
