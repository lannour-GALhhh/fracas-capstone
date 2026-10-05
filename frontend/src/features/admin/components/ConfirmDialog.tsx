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

/** A trigger that opens a confirm-then-act dialog. */
const ConfirmDialog = ({
    trigger,
    open: controlledOpen,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    destructive = false,
    isPending = false,
    onConfirm,
}: {
    /** Omit when controlling the dialog via `open`/`onOpenChange` (e.g. from a menu item). */
    trigger?: ReactElement
    open?: boolean
    onOpenChange?: (open: boolean) => void
    title: string
    description: string
    confirmLabel?: string
    destructive?: boolean
    isPending?: boolean
    onConfirm: () => void
}) => {
    const [innerOpen, setInnerOpen] = useState(false)
    const open = controlledOpen ?? innerOpen
    const setOpen = onOpenChange ?? setInnerOpen

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger render={trigger} />}
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
