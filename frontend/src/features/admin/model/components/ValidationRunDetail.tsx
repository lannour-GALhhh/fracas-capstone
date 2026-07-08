import { useState } from 'react'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/common/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/common/ui/table'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import capitalize from '@/common/utils/capitalize'
import { useValidationRun } from '../../hooks/useValidationRuns'
import ValidationStatusBadge from './ValidationStatusBadge'
import type { ValidationRun } from '../../types/model'

/** Per-event hindcast breakdown for one run, opened from the runs table. */
const ValidationRunDetail = ({ run }: { run: ValidationRun }) => {
    const [open, setOpen] = useState(false)
    // Poll while the dialog is open so a still-running run fills in live.
    const { data } = useValidationRun(run.id, open)
    const details = (open ? data?.details : run.details) ?? []

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size='sm' variant='ghost' />}>Details</DialogTrigger>
            <DialogContent className='sm:max-w-2xl'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        Run #{run.id}
                        <ValidationStatusBadge status={data?.status ?? run.status} />
                    </DialogTitle>
                </DialogHeader>

                {(data?.status ?? run.status) === 'failed' && (
                    <p className='text-sm text-destructive'>{data?.error || run.error}</p>
                )}

                <div className='max-h-[50vh] overflow-y-auto'>
                    <Table className='rounded border border-border'>
                        <TableHeader className='bg-accent'>
                            <TableRow>
                                <TableHead>Barangay</TableHead>
                                <TableHead>Occurred</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Hit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {details.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className='text-black/50'>
                                        No events evaluated yet.
                                    </TableCell>
                                </TableRow>
                            )}
                            {details.map((d, i) => (
                                <TableRow key={i}>
                                    <TableCell className='font-medium'>{d.barangay}</TableCell>
                                    <TableCell className='text-black/60'>
                                        {new Date(d.occurred_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell className='text-black/60'>
                                        {d.error ? (
                                            <span className='text-destructive'>{d.error}</span>
                                        ) : (
                                            capitalize(d.category ?? '')
                                        )}
                                    </TableCell>
                                    <TableCell className='text-black/60'>{d.score ?? '—'}</TableCell>
                                    <TableCell>
                                        {d.error ? (
                                            '—'
                                        ) : (
                                            <Badge variant={d.hit ? 'default' : 'secondary'}>
                                                {d.hit ? 'Hit' : 'Miss'}
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter>
                    <DialogClose render={<Button type='button' variant='outline' />}>Close</DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ValidationRunDetail
