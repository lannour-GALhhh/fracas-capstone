import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/common/ui/table'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
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
import { getPageItems } from '@/common/utils/pageItems'
import { useBarangays } from '@/features/gis/hooks/useBarangays'
import { useFloodEvents } from '../hooks/useFloodEvents'
import { SEVERITY_COLORS, SEVERITY_LABELS, SEVERITY_FILTERS } from '../constants/floodEvents'
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

const FloodHistory = () => {
    const navigate = useNavigate()
    const [severity, setSeverity] = useState<FloodSeverity | 'all'>('all')
    const [page, setPage] = useState(1)

    // Barangay filter is URL-driven so the map panel can deep-link into it.
    const [searchParams, setSearchParams] = useSearchParams()
    const barangayParam = searchParams.get('barangay')
    const barangayId = barangayParam ? Number(barangayParam) : undefined

    const { data: barangays } = useBarangays()
    const barangayOptions = useMemo(
        () =>
            (barangays?.features ?? [])
                .map((f) => ({ id: f.properties.id, name: f.properties.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [barangays],
    )
    const barangayName = barangayOptions.find((o) => o.id === barangayId)?.name

    // A changed barangay filter resets to the first page (adjust-during-render).
    const [lastBarangay, setLastBarangay] = useState(barangayId)
    if (barangayId !== lastBarangay) {
        setLastBarangay(barangayId)
        setPage(1)
    }

    const setBarangayFilter = (value: string) => {
        const next = new URLSearchParams(searchParams)
        if (value === 'all') next.delete('barangay')
        else next.set('barangay', value)
        setSearchParams(next, { replace: true })
    }

    const filters = {
        page,
        ...(severity !== 'all' && { severity }),
        ...(barangayId && { barangay: barangayId }),
    }
    const { data, isLoading, isError } = useFloodEvents(filters)

    const events = data?.results ?? []
    const count = data?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
    const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const end = Math.min(page * PAGE_SIZE, count)

    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages))
    const onSeverity = (value: FloodSeverity | 'all') => {
        setSeverity(value)
        setPage(1)
    }

    return (
        <div className='w-full p-4'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-semibold'>Flood History</h1>
                    <p className='text-xs text-black/50'>
                        Recorded flood events and their response.
                    </p>
                </div>
            </div>

            <Card size='sm' className='flex flex-row items-center gap-2 my-4'>
                <Select
                    value={barangayId ? String(barangayId) : 'all'}
                    onValueChange={(v) => setBarangayFilter(v as string)}
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

                <Select value={severity} onValueChange={(v) => onSeverity(v as FloodSeverity | 'all')}>
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

                {(severity !== 'all' || barangayId) && (
                    <Button
                        size='sm'
                        variant='ghost'
                        className='text-black/50 cursor-pointer'
                        onClick={() => {
                            setSeverity('all')
                            setBarangayFilter('all')
                            setPage(1)
                        }}
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
                        <TableHead>Water Depth</TableHead>
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
                            <TableCell colSpan={COLS} className='text-destructive'>
                                Couldn&apos;t load the flood history.
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
                    {events.map((e) => (
                        <TableRow
                            key={e.id}
                            className='cursor-pointer'
                            onClick={() => navigate(`/history/${e.id}`)}
                        >
                            <TableCell
                                className='whitespace-nowrap'
                                title={new Date(e.occurred_at).toLocaleString()}
                            >
                                {format(new Date(e.occurred_at), 'LLL dd, y')}
                            </TableCell>
                            <TableCell className='font-medium'>{e.barangay_name}</TableCell>
                            <TableCell>
                                <SeverityCell severity={e.severity} />
                            </TableCell>
                            <TableCell className='tabular-nums'>
                                {e.water_depth_m != null ? `${e.water_depth_m} m` : '—'}
                            </TableCell>
                            <TableCell className='text-black/60'>{e.source || '—'}</TableCell>
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
                        </TableRow>
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
