import { useState, type ReactElement } from 'react'
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
import { Button } from '@/common/ui/button'

/** A trigger that opens a confirm-then-act dialog. Closes immediately on
 * confirm; the action's own toast reports success/failure. */
const ConfirmDialog = ({
    trigger,
    title,
    description,
    confirmLabel = 'Confirm',
    destructive = false,
    isPending = false,
    onConfirm,
}: {
    trigger: ReactElement
    title: string
    description: string
    confirmLabel?: string
    destructive?: boolean
    isPending?: boolean
    onConfirm: () => void
}) => {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={trigger} />
            <DialogContent className='sm:max-w-sm'>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose render={<Button type='button' variant='outline' />}>
                        Cancel
                    </DialogClose>
                    <Button
                        type='button'
                        variant={destructive ? 'destructive' : 'default'}
                        disabled={isPending}
                        onClick={() => {
                            onConfirm()
                            setOpen(false)
                        }}
                    >
                        {isPending ? 'Working…' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ConfirmDialog
