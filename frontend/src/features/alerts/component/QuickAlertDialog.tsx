import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Textarea } from '@/common/ui/textarea'
import { useZodForm } from '@/common/hooks/useZodForm'
import { useBroadcast } from '../hooks/useBroadcast'
import { QuickAlertSchema } from '../schemas'

interface QuickAlertDialogProps {
    barangayId: number
    barangayName: string
    triggerClassName?: string
}

/** Send an advisory to one barangay's subscribers from the map panel, in a modal. */
const QuickAlertDialog = ({ barangayId, barangayName, triggerClassName }: QuickAlertDialogProps) => {
    const broadcast = useBroadcast()
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')

    const { fieldError, onBlur, handleSubmit, reset } = useZodForm(QuickAlertSchema, { message })

    // Reset the form + last result whenever the modal opens fresh.
    const onOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) {
            setTitle('')
            setMessage('')
            reset()
            broadcast.reset()
        }
    }

    const onSubmit = handleSubmit(() => {
        broadcast.mutate(
            {
                barangay: barangayId,
                title: title.trim() || undefined,
                message: message.trim(),
            },
            { onSuccess: () => setOpen(false) },
        )
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger
                render={
                    <Button size='sm' className={triggerClassName}>
                        <AlertTriangle className='size-4' />
                        Send alert
                    </Button>
                }
            />
            <DialogContent className='max-w-md'>
                <DialogHeader>
                    <DialogTitle>Send alert — {barangayName}</DialogTitle>
                    <DialogDescription>
                        Pushes an advisory to this barangay&apos;s subscribers across every channel
                        they&apos;ve opted into. Recorded in the alert log.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit}>
                    <FieldGroup className='gap-3'>
                        <Field>
                            <FieldLabel htmlFor='quick-alert-title'>
                                Title <span className='text-black/40'>(optional)</span>
                            </FieldLabel>
                            <Input
                                id='quick-alert-title'
                                value={title}
                                maxLength={150}
                                placeholder='Advisory'
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor='quick-alert-message'>Message</FieldLabel>
                            <Textarea
                                id='quick-alert-message'
                                value={message}
                                rows={3}
                                autoFocus
                                placeholder='e.g. River rising fast — move to higher ground now.'
                                onChange={(e) => setMessage(e.target.value)}
                                onBlur={onBlur('message')}
                            />
                            <FieldError errors={fieldError('message')} />
                        </Field>

                        {broadcast.isError && (
                            <FieldDescription className='text-destructive'>
                                Failed to send. Try again.
                            </FieldDescription>
                        )}

                        <DialogFooter>
                            <DialogClose render={<Button type='button' variant='outline'>Close</Button>} />
                            <Button type='submit' disabled={broadcast.isPending} className='cursor-pointer'>
                                {broadcast.isPending ? 'Sending…' : 'Send broadcast'}
                            </Button>
                        </DialogFooter>
                    </FieldGroup>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default QuickAlertDialog
