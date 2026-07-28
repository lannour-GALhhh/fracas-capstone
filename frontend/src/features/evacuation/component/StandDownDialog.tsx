import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
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
import { useStandDown } from '../hooks/useStandDown'

interface StandDownDialogProps {
    evacuationId: number
    barangayName: string
}

/** Confirm closing an evacuation. Freezes the final counts as the record. */
const StandDownDialog = ({ evacuationId, barangayName }: StandDownDialogProps) => {
    const [open, setOpen] = useState(false)
    const standDown = useStandDown()

    const onOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) standDown.reset()
    }

    const handleConfirm = () => {
        standDown.mutate(evacuationId, { onSuccess: () => setOpen(false) })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger
                render={
                    <Button size='sm' variant='outline' className='cursor-pointer'>
                        <CheckCircle2 className='size-4' />
                        Stand down
                    </Button>
                }
            />
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>Stand down evacuation — {barangayName}?</DialogTitle>
                    <DialogDescription>
                        This closes the evacuation and freezes its current counts as the permanent
                        record. Residents are no longer tracked for this event.
                    </DialogDescription>
                </DialogHeader>

                {standDown.isError && (
                    <p className='text-destructive text-sm'>Couldn&apos;t stand down. Please try again.</p>
                )}

                <DialogFooter>
                    <DialogClose render={<Button type='button' variant='outline'>Cancel</Button>} />
                    <Button
                        type='button'
                        className='cursor-pointer'
                        disabled={standDown.isPending}
                        onClick={handleConfirm}
                    >
                        {standDown.isPending ? 'Standing down…' : 'Confirm stand-down'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default StandDownDialog
