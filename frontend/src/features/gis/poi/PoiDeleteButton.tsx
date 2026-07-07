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

interface Props {
    /** What kind of POI this is, for the prompt copy (e.g. "hotspot"). */
    kind: string
    /** The POI's name, shown in the confirmation so the operator can double-check. */
    name: string
    saving: boolean
    onConfirm: () => void
}

/**
 * Trash-icon button that gates the destructive delete behind a confirm dialog,
 * matching the two-step delete convention used elsewhere (e.g. flood events).
 * The delete is permanent, so there's no undo affordance to fall back on.
 */
const PoiDeleteButton = ({ kind, name, saving, onConfirm }: Props) => {
    const [open, setOpen] = useState(false)

    const handleDelete = () => {
        onConfirm()
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button type='button' size='sm' variant='ghost' aria-label={`Delete ${kind}`}>
                        <Trash2 className='size-4 text-destructive' />
                    </Button>
                }
            />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <AlertTriangle className='text-destructive size-4' />
                        Delete {kind}?
                    </DialogTitle>
                    <DialogDescription>
                        {name.trim() ? (
                            <>
                                <span className='text-foreground font-medium'>{name.trim()}</span> will
                                be permanently removed. This can’t be undone.
                            </>
                        ) : (
                            <>This {kind} will be permanently removed. This can’t be undone.</>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose render={<Button variant='outline' size='sm' />}>Cancel</DialogClose>
                    <Button
                        type='button'
                        size='sm'
                        variant='destructive'
                        onClick={handleDelete}
                        disabled={saving}
                    >
                        {saving ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default PoiDeleteButton
