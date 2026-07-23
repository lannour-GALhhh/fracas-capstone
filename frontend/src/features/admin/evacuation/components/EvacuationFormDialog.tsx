import { useState, type ReactElement } from 'react'
import type { Feature, Point } from 'geojson'
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Checkbox } from '@/common/ui/checkbox'
import { Button } from '@/common/ui/button'
import { useZodForm } from '@/common/hooks/useZodForm'
import { useSaveEvacuationCenter } from '@/features/gis/poi/usePoi'
import type { EvacuationInput, EvacuationProperties } from '@/features/gis/poi/types'
import { EvacuationSchema } from '../schema'

type EvacFeature = Feature<Point, EvacuationProperties>

const emptyForm = {
    name: '',
    latitude: '',
    longitude: '',
    capacity: '',
    contact: '',
    isActive: true,
}

type FormState = typeof emptyForm

const toForm = (center?: EvacFeature): FormState => {
    if (!center) return emptyForm
    const [lng, lat] = center.geometry.coordinates
    const p = center.properties
    return {
        name: p.name,
        latitude: String(lat),
        longitude: String(lng),
        capacity: p.capacity != null ? String(p.capacity) : '',
        contact: p.contact ?? '',
        isActive: p.is_active,
    }
}

/** Add (no `center`) or edit an evacuation center. Coordinates go in as flat
 * lat/lng; the backend resolves the containing barangay by point-in-polygon. */
const EvacuationFormDialog = ({
    trigger,
    center,
}: {
    trigger: ReactElement
    center?: EvacFeature
}) => {
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState<FormState>(() => toForm(center))
    const save = useSaveEvacuationCenter()

    const { fieldError, onBlur, handleSubmit, reset } = useZodForm(EvacuationSchema, {
        name: form.name,
        latitude: form.latitude,
        longitude: form.longitude,
        capacity: form.capacity,
    })

    const onOpenChange = (next: boolean) => {
        if (next) {
            setForm(toForm(center))
            reset()
            save.reset()
        }
        setOpen(next)
    }

    const setStr = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const onSubmit = handleSubmit(() => {
        const payload: EvacuationInput = {
            name: form.name.trim(),
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
            capacity: form.capacity.trim() === '' ? null : Number(form.capacity),
            contact: form.contact.trim(),
            is_active: form.isActive,
        }
        save.mutate({ id: center?.properties.id, payload }, { onSuccess: () => setOpen(false) })
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={onSubmit} className='flex flex-col gap-4'>
                    <DialogHeader>
                        <DialogTitle>
                            {center ? 'Edit evacuation center' : 'Add evacuation center'}
                        </DialogTitle>
                        <DialogDescription>
                            Centers appear on the map and ship to the resident app to find the
                            nearest one.
                        </DialogDescription>
                    </DialogHeader>

                    <Field>
                        <FieldLabel htmlFor='ec-name'>Name</FieldLabel>
                        <Input
                            id='ec-name'
                            maxLength={255}
                            placeholder='e.g. Rio Hondo Elementary School'
                            value={form.name}
                            onChange={setStr('name')}
                            onBlur={onBlur('name')}
                        />
                        <FieldError errors={fieldError('name')} />
                    </Field>

                    <div className='grid grid-cols-2 gap-4'>
                        <Field>
                            <FieldLabel htmlFor='ec-lat'>Latitude</FieldLabel>
                            <Input
                                id='ec-lat'
                                type='number'
                                step='any'
                                placeholder='6.9214'
                                value={form.latitude}
                                onChange={setStr('latitude')}
                                onBlur={onBlur('latitude')}
                            />
                            <FieldError errors={fieldError('latitude')} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor='ec-lng'>Longitude</FieldLabel>
                            <Input
                                id='ec-lng'
                                type='number'
                                step='any'
                                placeholder='122.0790'
                                value={form.longitude}
                                onChange={setStr('longitude')}
                                onBlur={onBlur('longitude')}
                            />
                            <FieldError errors={fieldError('longitude')} />
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel htmlFor='ec-capacity'>
                            Capacity <span className='text-black/40'>(optional)</span>
                        </FieldLabel>
                        <Input
                            id='ec-capacity'
                            type='number'
                            min='0'
                            step='1'
                            placeholder='Number of people'
                            value={form.capacity}
                            onChange={setStr('capacity')}
                            onBlur={onBlur('capacity')}
                        />
                        <FieldError errors={fieldError('capacity')} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor='ec-contact'>
                            Contact <span className='text-black/40'>(optional)</span>
                        </FieldLabel>
                        <Input
                            id='ec-contact'
                            maxLength={255}
                            placeholder='Phone or person in charge'
                            value={form.contact}
                            onChange={setStr('contact')}
                        />
                    </Field>

                    <label className='flex cursor-pointer items-center gap-2 text-sm'>
                        <Checkbox
                            checked={form.isActive}
                            onCheckedChange={(v) =>
                                setForm((prev) => ({ ...prev, isActive: Boolean(v) }))
                            }
                        />
                        Active (shown to residents)
                    </label>

                    {save.isError && (
                        <FieldDescription className='text-destructive'>
                            Couldn&apos;t save. Check the fields and try again.
                        </FieldDescription>
                    )}

                    <DialogFooter>
                        <DialogClose render={<Button type='button' variant='outline' />}>
                            Cancel
                        </DialogClose>
                        <Button type='submit' disabled={save.isPending}>
                            {save.isPending ? 'Saving…' : center ? 'Save changes' : 'Add center'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default EvacuationFormDialog
