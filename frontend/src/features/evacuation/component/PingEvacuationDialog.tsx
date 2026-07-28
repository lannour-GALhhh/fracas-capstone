import { useState } from 'react'
import { AlertTriangle, Siren } from 'lucide-react'
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
import { usePingEvacuation } from '../hooks/usePingEvacuation'

interface PingEvacuationDialogProps {
    barangayId: number
    barangayName: string
    triggerClassName?: string
}

/**
 * Destructive "Ping Evacuation" action from the map panel. Declaring an
 * evacuation pushes an evacuate-now notice to every subscriber and starts
 * tracking who has reached safety — so it's gated behind an explicit confirm.
 */
const PingEvacuationDialog = ({
    barangayId,
    barangayName,
    triggerClassName,
}: PingEvacuationDialogProps) => {
    const [open, setOpen] = useState(false)
    const ping = usePingEvacuation()

    const onOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) ping.reset()
    }

    const handleConfirm = () => {
        ping.mutate(barangayId, { onSuccess: () => setOpen(false) })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger
                render={
                    <Button size='sm' variant='destructive' className={triggerClassName}>
                        <Siren className='size-4' />
                        Ping Evacuation
                    </Button>
                }
            />
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='text-destructive flex items-center gap-2'>
                        <AlertTriangle className='size-4' />
                        Declare evacuation — {barangayName}?
                    </DialogTitle>
                    <DialogDescription>
                        This pushes an <span className='font-medium'>evacuate-now</span> notice to
                        every subscriber in {barangayName} and begins tracking who has reached
                        safety. The action is recorded against your account. You can stand it down
                        from the Evacuations page.
                    </DialogDescription>
                </DialogHeader>

                {ping.isError && (
                    <p className='text-destructive text-sm'>Couldn&apos;t declare it. Please try again.</p>
                )}

                <DialogFooter>
                    <DialogClose render={<Button type='button' variant='outline'>Cancel</Button>} />
                    <Button
                        type='button'
                        variant='destructive'
                        className='cursor-pointer'
                        disabled={ping.isPending}
                        onClick={handleConfirm}
                    >
                        <Siren className='size-4' />
                        {ping.isPending ? 'Declaring…' : 'Declare evacuation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default PingEvacuationDialog
