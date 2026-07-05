import { useMemo, useState } from 'react'
import { Card } from '@/common/ui/card'
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Textarea } from '@/common/ui/textarea'
import { Button } from '@/common/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/common/ui/select'
import { useBarangays } from '@/features/gis/hooks/useBarangays'
import { useZodForm } from '@/common/hooks/useZodForm'
import { useBroadcast } from '../hooks/useBroadcast'
import { BroadcastSchema } from '../schemas'

/** Operator broadcast console: push a manual advisory to a barangay's subscribers. */
const BroadcastForm = () => {
    const { data: collection, isLoading: loadingBarangays } = useBarangays()
    const broadcast = useBroadcast()

    const [barangay, setBarangay] = useState('')
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')

    const options = useMemo(
        () =>
            (collection?.features ?? [])
                .map((f) => ({ id: f.properties.id, name: f.properties.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [collection],
    )
    const selectedName = options.find((o) => String(o.id) === barangay)?.name

    const { fieldError, onBlur, markTouched, handleSubmit } = useZodForm(BroadcastSchema, {
        barangay,
        message,
    })

    const onSubmit = handleSubmit(() => {
        broadcast.mutate(
            { barangay: Number(barangay), title: title.trim() || undefined, message: message.trim() },
            {
                onSuccess: () => {
                    setTitle('')
                    setMessage('')
                },
            },
        )
    })

    return (
        <Card size='sm' className='my-4 gap-4'>
            <div>
                <h2 className='text-sm font-semibold'>Broadcast advisory</h2>
                <p className='text-xs text-black/50'>
                    Send a manual alert to a barangay&apos;s subscribers. Recorded in the log below.
                </p>
            </div>

            <form onSubmit={onSubmit}>
                <FieldGroup className='gap-3'>
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-[minmax(12rem,16rem)_1fr]'>
                        <Field>
                            <FieldLabel htmlFor='broadcast-barangay'>Target barangay</FieldLabel>
                            <Select
                                id='broadcast-barangay'
                                value={barangay}
                                onValueChange={(v) => {
                                    setBarangay(String(v))
                                    markTouched('barangay')
                                }}
                                disabled={loadingBarangays}
                            >
                                <SelectTrigger className='w-full'>
                                    <SelectValue placeholder={loadingBarangays ? 'Loading…' : 'Select a barangay'}>
                                        {selectedName}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className='max-h-72'>
                                    {options.map((o) => (
                                        <SelectItem key={o.id} value={String(o.id)}>
                                            {o.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError errors={fieldError('barangay')} />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='broadcast-title'>
                                Title <span className='text-black/40'>(optional)</span>
                            </FieldLabel>
                            <Input
                                id='broadcast-title'
                                value={title}
                                maxLength={150}
                                placeholder='Advisory'
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel htmlFor='broadcast-message'>Message</FieldLabel>
                        <Textarea
                            id='broadcast-message'
                            value={message}
                            rows={3}
                            placeholder='e.g. Tumaga river rising fast — move to higher ground now.'
                            onChange={(e) => setMessage(e.target.value)}
                            onBlur={onBlur('message')}
                        />
                        <FieldError errors={fieldError('message')} />
                    </Field>

                    <div className='flex items-center gap-3'>
                        <Button type='submit' size='sm' disabled={broadcast.isPending} className='cursor-pointer'>
                            {broadcast.isPending ? 'Sending…' : 'Send broadcast'}
                        </Button>
                        {broadcast.isError && (
                            <FieldDescription className='text-destructive'>
                                Failed to send. Try again.
                            </FieldDescription>
                        )}
                    </div>
                </FieldGroup>
            </form>
        </Card>
    )
}

export default BroadcastForm
