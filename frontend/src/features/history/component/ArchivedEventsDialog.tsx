import { useState } from 'react'
import { format } from 'date-fns'
import { Archive, Undo2 } from 'lucide-react'
import { Button } from '@/common/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/common/ui/dialog'
import { useFloodEvents } from '../hooks/useFloodEvents'
import { useRestoreFloodEvent } from '../hooks/useFloodEventActions'
import { SEVERITY_LABELS } from '../constants/floodEvents'

/** Mirrors ARCHIVE_RETENTION_DAYS in backend/flood_events/tasks.py. */
const RETENTION_DAYS = 30
const DAY_MS = 86_400_000

const daysLeft = (archivedAt: string | null): number => {
    if (!archivedAt) return RETENTION_DAYS
    const elapsed = (Date.now() - new Date(archivedAt).getTime()) / DAY_MS
    return Math.max(0, Math.ceil(RETENTION_DAYS - elapsed))
}

/** "View archive" button + dialog listing archived flood events with restore actions. */
const ArchivedEventsDialog = () => {
    const [open, setOpen] = useState(false)
    const { data, isLoading, isError } = useFloodEvents({ archived: true }, open)
    const restore = useRestoreFloodEvent()
    const events = data?.results ?? []

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size='lg' variant='outline' className='cursor-pointer px-3'>
                        <Archive className='size-4' />
                        View archive
                    </Button>
                }
            />
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <DialogTitle>Archived flood events</DialogTitle>
                    <DialogDescription>
                        Archived events are permanently deleted {RETENTION_DAYS} days after
                        archiving. Restore one to put it back in the flood history.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <p className='text-muted-foreground text-sm'>Loading…</p>
                ) : isError ? (
                    <p className='text-destructive text-sm'>Couldn&apos;t load the archive.</p>
                ) : events.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>The archive is empty.</p>
                ) : (
                    <ul className='flex max-h-96 flex-col gap-2 overflow-y-auto'>
                        {events.map((e) => {
                            const left = daysLeft(e.archived_at)
                            return (
                                <li
                                    key={e.id}
                                    className='flex items-center justify-between gap-3 rounded-md border p-3'
                                >
                                    <div className='min-w-0'>
                                        <div className='truncate font-medium'>
                                            {e.barangay_name} ·{' '}
                                            {format(new Date(e.occurred_at), 'LLL dd, y')}
                                        </div>
                                        <div className='text-muted-foreground text-xs'>
                                            {SEVERITY_LABELS[e.severity]} · deletes in {left}{' '}
                                            {left === 1 ? 'day' : 'days'}
                                        </div>
                                    </div>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        disabled={restore.isPending}
                                        onClick={() => restore.mutate(e.id)}
                                    >
                                        <Undo2 />
                                        Restore
                                    </Button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default ArchivedEventsDialog
