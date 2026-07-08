import { useState } from 'react'
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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from '@/common/ui/pagination'
import { cn } from '@/common/utils/utils'
import { useValidationRuns } from '../../hooks/useValidationRuns'
import ValidationStatusBadge from './ValidationStatusBadge'
import ValidationRunDetail from './ValidationRunDetail'

const PAGE_SIZE = 25
const COLS = 6

const formatRecall = (recall: number | null) =>
    recall === null ? '—' : `${Math.round(recall * 100)}%`

const ValidationRunsTable = () => {
    const [page, setPage] = useState(1)
    const { data, isLoading, isError } = useValidationRuns(page)

    const runs = data?.results ?? []
    const count = data?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

    return (
        <Table className='rounded border border-border'>
            <TableHeader className='bg-accent'>
                <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Recall</TableHead>
                    <TableHead>Mean score</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
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
                            Couldn't load validation runs.
                        </TableCell>
                    </TableRow>
                )}
                {!isLoading && !isError && runs.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={COLS} className='text-black/50'>
                            No runs yet.
                        </TableCell>
                    </TableRow>
                )}
                {runs.map((run) => (
                    <TableRow key={run.id}>
                        <TableCell className='font-medium'>
                            #{run.id}
                            <span className='ml-2 text-xs font-normal text-black/40'>
                                {new Date(run.created_at).toLocaleString()}
                            </span>
                        </TableCell>
                        <TableCell>
                            <ValidationStatusBadge status={run.status} />
                        </TableCell>
                        <TableCell className='text-black/60'>
                            {run.hits}/{run.events_evaluated}
                        </TableCell>
                        <TableCell className='text-black/60'>{formatRecall(run.recall)}</TableCell>
                        <TableCell className='text-black/60'>
                            {run.mean_score === null ? '—' : run.mean_score.toFixed(1)}
                        </TableCell>
                        <TableCell className='text-right'>
                            <ValidationRunDetail run={run} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={COLS}>
                        <Pagination>
                            <PaginationContent className='ml-auto'>
                                <PaginationItem>
                                    <PaginationPrevious
                                        className={cn(page === 1 && 'pointer-events-none opacity-50')}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    />
                                </PaginationItem>
                                <PaginationItem>
                                    <Button variant='ghost' size='sm' disabled className='text-xs'>
                                        Page {page} of {totalPages}
                                    </Button>
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationNext
                                        className={cn(
                                            page === totalPages && 'pointer-events-none opacity-50',
                                        )}
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </TableCell>
                </TableRow>
            </TableFooter>
        </Table>
    )
}

export default ValidationRunsTable
