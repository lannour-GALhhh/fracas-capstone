import { useState } from 'react'
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
import { useArchivedCenters, useRestoreEvacuationCenter } from '@/features/gis/poi/usePoi'

/** Mirrors ARCHIVE_RETENTION_DAYS in backend/evacuation/tasks.py. */
const RETENTION_DAYS = 30
const DAY_MS = 86_400_000

const daysLeft = (archivedAt: string | null): number => {
    if (!archivedAt) return RETENTION_DAYS
    const elapsed = (Date.now() - new Date(archivedAt).getTime()) / DAY_MS
    return Math.max(0, Math.ceil(RETENTION_DAYS - elapsed))
}

/** "View archive" button + dialog listing archived centers with restore actions. */
const ArchiveDialog = () => {
    const [open, setOpen] = useState(false)
    const { data, isLoading, isError } = useArchivedCenters(open)
    const restore = useRestoreEvacuationCenter()
    const centers = data?.features ?? []

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
                    <DialogTitle>Archived evacuation centers</DialogTitle>
                    <DialogDescription>
                        Archived centers are permanently deleted {RETENTION_DAYS} days after
                        archiving. Restore one to put it back on the map.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <p className='text-muted-foreground text-sm'>Loading…</p>
                ) : isError ? (
                    <p className='text-destructive text-sm'>Couldn't load the archive.</p>
                ) : centers.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>The archive is empty.</p>
                ) : (
                    <ul className='flex max-h-96 flex-col gap-2 overflow-y-auto'>
                        {centers.map((c) => {
                            const p = c.properties
                            const left = daysLeft(p.archived_at)
                            return (
                                <li
                                    key={p.id}
                                    className='flex items-center justify-between gap-3 rounded-md border p-3'
                                >
                                    <div className='min-w-0'>
                                        <div className='truncate font-medium'>{p.name}</div>
                                        <div className='text-muted-foreground text-xs'>
                                            {p.barangay_name ?? 'No barangay'} · deletes in {left}{' '}
                                            {left === 1 ? 'day' : 'days'}
                                        </div>
                                    </div>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        disabled={restore.isPending}
                                        onClick={() => restore.mutate(p.id)}
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

export default ArchiveDialog
