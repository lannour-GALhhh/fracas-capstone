import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
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
import { useMarkSafe } from '../hooks/useMarkSafe'

interface MarkSafeDialogProps {
    evacuationId: number
    barangayName: string
}

/** Confirm closing an evacuation as safe. Freezes the final counts as the record. */
const MarkSafeDialog = ({ evacuationId, barangayName }: MarkSafeDialogProps) => {
    const [open, setOpen] = useState(false)
    const markSafe = useMarkSafe()

    const onOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) markSafe.reset()
    }

    const handleConfirm = () => {
        markSafe.mutate(evacuationId, { onSuccess: () => setOpen(false) })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger
                render={
                    <Button size='sm' className='cursor-pointer'>
                        <ShieldCheck className='size-4' />
                        Mark as Safe
                    </Button>
                }
            />
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>Mark {barangayName} as safe?</DialogTitle>
                    <DialogDescription>
                        This closes the evacuation and freezes its current counts as the permanent
                        record. Residents are no longer tracked for this event.
                    </DialogDescription>
                </DialogHeader>

                {markSafe.isError && (
                    <p className='text-destructive text-sm'>
                        Couldn&apos;t mark it as safe. Please try again.
                    </p>
                )}

                <DialogFooter>
                    <DialogClose render={<Button type='button' variant='outline'>Cancel</Button>} />
                    <Button
                        type='button'
                        className='cursor-pointer'
                        disabled={markSafe.isPending}
                        onClick={handleConfirm}
                    >
                        {markSafe.isPending ? 'Marking safe…' : 'Mark as Safe'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default MarkSafeDialog
