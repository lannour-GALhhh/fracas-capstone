import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/common/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/common/ui/dialog'
import { useDeleteFloodEvent } from '../hooks/useDeleteFloodEvent'

interface DeleteEventDialogProps {
    eventId: number
    barangayName: string
    onDeleted: (id: number) => void
}

/** Destructive delete with a two-step confirm; server-side delete is soft (6h undo). */
const DeleteEventDialog = ({ eventId, barangayName, onDeleted }: DeleteEventDialogProps) => {
    const [open, setOpen] = useState(false)
    const [stage, setStage] = useState<1 | 2>(1)
    const del = useDeleteFloodEvent()

    const onOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) {
            setStage(1)
            del.reset()
        }
    }

    const handleDelete = () => {
        del.mutate(eventId, {
            onSuccess: () => {
                setOpen(false)
                onDeleted(eventId)
            },
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger
                render={
                    <Button
                        size='sm'
                        variant='outline'
                        className='cursor-pointer text-destructive'
                    >
                        <Trash2 className='size-4' />
                        Delete
                    </Button>
                }
            />
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2 text-destructive'>
                        <AlertTriangle className='size-4' />
                        {stage === 1 ? 'Delete this flood event?' : 'Are you absolutely sure?'}
                    </DialogTitle>
                    <DialogDescription>
                        {stage === 1 ? (
                            <>
                                The record for <span className='font-medium'>Barangay {barangayName}</span>{' '}
                                will be removed from the flood history. It stays recoverable for 6 hours
                                before it&apos;s permanently purged.
                            </>
                        ) : (
                            'This removes the event and its telemetry from the history view. You can undo it within the next 6 hours.'
                        )}
                    </DialogDescription>
                </DialogHeader>

                {del.isError && (
                    <p className='text-sm text-destructive'>Couldn&apos;t delete. Please try again.</p>
                )}

                <DialogFooter>
                    <DialogClose render={<Button type='button' variant='outline'>Cancel</Button>} />
                    {stage === 1 ? (
                        <Button
                            type='button'
                            variant='destructive'
                            className='cursor-pointer'
                            onClick={() => setStage(2)}
                        >
                            <Trash2 className='size-4' />
                            Delete event
                        </Button>
                    ) : (
                        <Button
                            type='button'
                            variant='destructive'
                            className='cursor-pointer'
                            disabled={del.isPending}
                            onClick={handleDelete}
                        >
                            {del.isPending ? 'Deleting…' : 'Yes, delete it'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default DeleteEventDialog
