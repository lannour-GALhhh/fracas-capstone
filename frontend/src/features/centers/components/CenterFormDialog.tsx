import { useCallback, useState, type ReactElement } from 'react'
import type { Feature, Point } from 'geojson'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/common/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Switch } from '@/common/ui/switch'
import { Button } from '@/common/ui/button'
import { useZodForm } from '@/common/hooks/useZodForm'
import { useSaveEvacuationCenter } from '@/features/gis/poi/usePoi'
import type {
    CenterPhoto,
    EvacuationContact,
    EvacuationInput,
    EvacuationProperties,
} from '@/features/gis/poi/types'
import { CenterSchema } from '../schema'
import ContactsField from './ContactsField'
import ImagesField from './ImagesField'
import LocationPicker from './LocationPicker'

type EvacFeature = Feature<Point, EvacuationProperties>

const emptyForm = {
    name: '',
    latitude: '',
    longitude: '',
    capacity: '',
    contacts: [{ label: '', phone: '' }] as EvacuationContact[],
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
        contacts: p.contacts.length
            ? p.contacts.map(({ label, phone }) => ({ label, phone }))
            : emptyForm.contacts,
        isActive: p.is_active,
    }
}

/** A center's saved photos, in display order, as form items. */
const toPhotos = (center?: EvacFeature): CenterPhoto[] =>
    (center?.properties.images ?? []).map((img) => ({
        key: `img-${img.id}`,
        url: img.image,
        id: img.id,
    }))

/** Add or edit an evacuation center; barangay resolves by point-in-polygon. */
const CenterFormDialog = ({
    trigger,
    center,
}: {
    trigger: ReactElement
    center?: EvacFeature
}) => {
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState<FormState>(() => toForm(center))
    const [photos, setPhotos] = useState<CenterPhoto[]>(() => toPhotos(center))
    const save = useSaveEvacuationCenter()

    const { fieldError, onBlur, handleSubmit, reset } = useZodForm(CenterSchema, {
        name: form.name,
        latitude: form.latitude,
        longitude: form.longitude,
        capacity: form.capacity,
        contacts: form.contacts,
    })

    const onPin = useCallback(
        (lat: number, lng: number) =>
            setForm((prev) => ({
                ...prev,
                latitude: lat.toFixed(6),
                longitude: lng.toFixed(6),
            })),
        [],
    )

    const onOpenChange = (next: boolean) => {
        if (next) {
            setForm(toForm(center))
            setPhotos(toPhotos(center))
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
            contacts: form.contacts
                .map((c) => ({ label: c.label.trim(), phone: c.phone.trim() }))
                .filter((c) => c.phone !== ''),
            is_active: form.isActive,
        }
        save.mutate(
            {
                id: center?.properties.id,
                payload,
                photos,
                // Saved photos no longer in the list were removed in the form.
                removedImageIds: (center?.properties.images ?? [])
                    .map((img) => img.id)
                    .filter((imgId) => !photos.some((p) => p.id === imgId)),
            },
            { onSuccess: () => setOpen(false) },
        )
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className='max-h-[94vh] gap-5 overflow-y-auto p-6 sm:max-w-4xl'>
                <form onSubmit={onSubmit} className='flex flex-col gap-5'>
                    <DialogHeader>
                        <DialogTitle>
                            {center ? 'Edit evacuation center' : 'Add evacuation center'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className='grid gap-8 sm:grid-cols-2'>
                        <div className='flex flex-col gap-4'>
                            <Field>
                                <FieldLabel htmlFor='ec-name'>Name</FieldLabel>
                                <Input
                                    id='ec-name'
                                    maxLength={255}
                                    value={form.name}
                                    onChange={setStr('name')}
                                    onBlur={onBlur('name')}
                                />
                                <FieldError errors={fieldError('name')} />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor='ec-capacity'>
                                    Capacity
                                </FieldLabel>
                                <Input
                                    id='ec-capacity'
                                    type='number'
                                    min='0'
                                    step='1'
                                    onKeyDown={(e) => {
                                        // type=number still admits exponent/sign/decimal characters
                                        if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault()
                                    }}
                                    value={form.capacity}
                                    onChange={setStr('capacity')}
                                    onBlur={onBlur('capacity')}
                                />
                                <FieldError errors={fieldError('capacity')} />
                            </Field>

                            <div>
                                <ContactsField
                                    value={form.contacts}
                                    onChange={(contacts) =>
                                        setForm((prev) => ({ ...prev, contacts }))
                                    }
                                />
                                <FieldError errors={fieldError('contacts')} />
                            </div>

                            <ImagesField photos={photos} onChange={setPhotos} />
                        </div>

                        <div className='flex flex-col gap-3'>
                            <div className='grid grid-cols-2 gap-3'>
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
                            <FieldDescription>
                                Type coordinates, or click the map / drag the pin to set the
                                location.
                            </FieldDescription>
                            <LocationPicker
                                latitude={form.latitude}
                                longitude={form.longitude}
                                onChange={onPin}
                            />
                        </div>
                    </div>

                    <div className='flex items-center justify-between gap-4 rounded-md border p-3'>
                        <div>
                            <label htmlFor='ec-active' className='text-sm font-medium'>
                                Active
                            </label>
                            <p className='text-xs text-black/50'>
                                This center will {form.isActive ? '' : 'not '}be shown on the map
                                for the users.
                            </p>
                        </div>
                        <Switch
                            id='ec-active'
                            checked={form.isActive}
                            onCheckedChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))}
                        />
                    </div>

                    {save.isError && (
                        <FieldDescription className='text-destructive'>
                            Couldn&apos;t save. Check the fields and try again.
                        </FieldDescription>
                    )}

                    <DialogFooter>
                        <DialogClose render={<Button type='button' variant='outline' size='lg' className='px-5' />}>
                            Cancel
                        </DialogClose>
                        <Button type='submit' size='lg' className='px-5' disabled={save.isPending}>
                            {save.isPending ? 'Saving…' : center ? 'Save changes' : 'Add center'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default CenterFormDialog
