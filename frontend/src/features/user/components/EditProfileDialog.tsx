import { useState } from 'react'
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
import { Field, FieldLabel, FieldDescription, FieldError } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import { useZodForm } from '@/common/hooks/useZodForm'
import { ProfileSchema } from '../schemas'
import PlaceSelect from './PlaceSelect'
import { useUpdateProfile } from '../hooks/useCurrentUser'
import { useCities, useProvinces, usePsgcBarangays } from '../hooks/usePsgc'
import { emptyAddress, type Address, type CurrentUser, type ProfileUpdate } from '../types'

/** Edit the signed-in user's name, contact details and PSGC home address. */
const EditProfileDialog = ({ user }: { user: CurrentUser }) => {
    const [open, setOpen] = useState(false)
    const initial = () => ({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number ?? '',
        address: { ...emptyAddress(), ...user.address },
    })
    const [form, setForm] = useState(initial)
    const update = useUpdateProfile()

    const provinces = useProvinces()
    const cities = useCities(form.address.province_code)
    const barangays = usePsgcBarangays(form.address.city_code)

    const { fieldError, onBlur, handleSubmit, reset } = useZodForm(ProfileSchema, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number,
        zip_code: form.address.zip_code,
    })

    // Reset the fields to the latest profile whenever the dialog opens.
    const onOpenChange = (next: boolean) => {
        if (next) {
            setForm(initial())
            reset()
            update.reset()
        }
        setOpen(next)
    }

    const set = (key: 'first_name' | 'last_name' | 'email' | 'phone_number') =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const setAddr = (patch: Partial<Address>) =>
        setForm((prev) => ({ ...prev, address: { ...prev.address, ...patch } }))

    const onSubmit = handleSubmit(() => {
        const payload: ProfileUpdate = {
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            phone_number: form.phone_number.trim() || null,
            address: form.address,
        }
        update.mutate(payload, { onSuccess: () => setOpen(false) })
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger render={<Button size="lg" />}>Edit Profile Information</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle>Edit profile</DialogTitle>
                        <DialogDescription>
                            Update your name, contact details and home address.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel htmlFor="first_name">First name</FieldLabel>
                                <Input
                                    id="first_name"
                                    value={form.first_name}
                                    onChange={set('first_name')}
                                    onBlur={onBlur('first_name')}
                                />
                                <FieldError errors={fieldError('first_name')} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="last_name">Last name</FieldLabel>
                                <Input
                                    id="last_name"
                                    value={form.last_name}
                                    onChange={set('last_name')}
                                    onBlur={onBlur('last_name')}
                                />
                                <FieldError errors={fieldError('last_name')} />
                            </Field>
                        </div>
                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={set('email')}
                                onBlur={onBlur('email')}
                            />
                            <FieldError errors={fieldError('email')} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="phone_number">Phone number</FieldLabel>
                            <Input
                                id="phone_number"
                                type="tel"
                                autoComplete="tel"
                                placeholder="+639…"
                                value={form.phone_number}
                                onChange={set('phone_number')}
                                onBlur={onBlur('phone_number')}
                            />
                            <FieldError errors={fieldError('phone_number')} />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="unit">Unit / street</FieldLabel>
                            <Input
                                id="unit"
                                placeholder="House no., street / purok"
                                value={form.address.unit}
                                onChange={(e) => setAddr({ unit: e.target.value })}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="province">Province</FieldLabel>
                            <PlaceSelect
                                id="province"
                                value={form.address.province_code}
                                displayName={form.address.province}
                                options={provinces.data ?? []}
                                loading={provinces.isLoading}
                                onSelect={(p) =>
                                    setAddr({
                                        province_code: p.code,
                                        province: p.name,
                                        city_code: '',
                                        city: '',
                                        barangay_code: '',
                                        barangay: '',
                                    })
                                }
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="city">City / Municipality</FieldLabel>
                            <PlaceSelect
                                id="city"
                                value={form.address.city_code}
                                displayName={form.address.city}
                                options={cities.data ?? []}
                                loading={cities.isFetching}
                                disabled={!form.address.province_code}
                                onSelect={(c) =>
                                    setAddr({
                                        city_code: c.code,
                                        city: c.name,
                                        barangay_code: '',
                                        barangay: '',
                                    })
                                }
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="barangay">Barangay</FieldLabel>
                            <PlaceSelect
                                id="barangay"
                                value={form.address.barangay_code}
                                displayName={form.address.barangay}
                                options={barangays.data ?? []}
                                loading={barangays.isFetching}
                                disabled={!form.address.city_code}
                                onSelect={(b) => setAddr({ barangay_code: b.code, barangay: b.name })}
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel htmlFor="country">Country</FieldLabel>
                                <Input id="country" value={form.address.country} disabled />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="zip_code">ZIP code</FieldLabel>
                                <Input
                                    id="zip_code"
                                    inputMode="numeric"
                                    placeholder="7000"
                                    value={form.address.zip_code}
                                    onChange={(e) => setAddr({ zip_code: e.target.value })}
                                    onBlur={onBlur('zip_code')}
                                />
                                <FieldError errors={fieldError('zip_code')} />
                            </Field>
                        </div>
                    </div>

                    {update.isError && (
                        <FieldDescription className="text-red-500">
                            Couldn't save your changes. Please check the fields and try again.
                        </FieldDescription>
                    )}

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" />}>
                            Cancel
                        </DialogClose>
                        <Button type="submit" disabled={update.isPending}>
                            {update.isPending ? 'Saving…' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default EditProfileDialog
