import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/common/ui/table'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from '@/common/ui/pagination'
import { cn } from '@/common/utils/utils'
import { useEvacuationStatuses } from '../hooks/useEvacuationStatuses'
import { STATUS_LABELS, STATUS_TONES } from '../constants/evacuation'

const PAGE_SIZE = 25
const COLS = 3

const RESOLVED_LABELS: Record<string, string> = {
    center: 'Reached center',
    left_zone: 'Left danger zone',
}

interface EvacueeTableProps {
    evacuationId: number
}

/** Paginated per-resident report list for one evacuation (reporters only). */
const EvacueeTable = ({ evacuationId }: EvacueeTableProps) => {
    const [page, setPage] = useState(1)
    const { data, isLoading, isError } = useEvacuationStatuses(evacuationId, page)

    const rows = data?.results ?? []
    const count = data?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages))

    return (
        <Table className='border-border mt-3 rounded border'>
            <TableHeader className='bg-accent'>
                <TableRow>
                    <TableHead>Resident</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
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
                            Couldn&apos;t load the evacuee list.
                        </TableCell>
                    </TableRow>
                )}
                {!isLoading && !isError && rows.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={COLS} className='text-black/50'>
                            No residents have reported yet.
                        </TableCell>
                    </TableRow>
                )}
                {rows.map((r) => (
                    <TableRow key={r.id}>
                        <TableCell className='font-medium'>{r.user.label}</TableCell>
                        <TableCell>
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                                    STATUS_TONES[r.status],
                                )}
                            >
                                {STATUS_LABELS[r.status]}
                            </span>
                            {r.resolved_via && (
                                <span className='text-muted-foreground ml-2 text-xs'>
                                    {r.center_name ?? RESOLVED_LABELS[r.resolved_via]}
                                </span>
                            )}
                        </TableCell>
                        <TableCell
                            className='whitespace-nowrap text-black/60'
                            title={new Date(r.updated_at).toLocaleString()}
                        >
                            {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
            {count > PAGE_SIZE && (
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={COLS}>
                            <Pagination>
                                <PaginationContent className='ml-auto'>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            className={cn(page === 1 && 'pointer-events-none opacity-50')}
                                            onClick={() => goTo(page - 1)}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <span className='px-3 text-sm'>
                                            Page {page} of {totalPages}
                                        </span>
                                    </PaginationItem>
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
            )}
        </Table>
    )
}

export default EvacueeTable
