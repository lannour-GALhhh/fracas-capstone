import { Plus } from 'lucide-react'
import type { AxiosError } from 'axios'
import { useState } from 'react'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/common/ui/dialog'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import { useZodForm } from '@/common/hooks/useZodForm'
import { useCreateAdminUser } from '@/features/admin/hooks/useAdminUserMutations'
import { CreateUserSchema } from '@/features/admin/schemas'
import PlaceSelect from '@/features/user/components/PlaceSelect'
import { useCities, useProvinces, usePsgcBarangays } from '@/features/user/hooks/usePsgc'
import { emptyAddress, type Address } from '@/features/user/types'

const emptyForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: emptyAddress(),
}

/** Provision an operator account; the server generates credentials and emails an activation link. */
const CreateUserDialog = () => {
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const create = useCreateAdminUser()

    const { fieldError, onBlur, handleSubmit, reset } = useZodForm(CreateUserSchema, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number,
        street: form.address.unit,
        province: form.address.province,
        city: form.address.city,
        barangay: form.address.barangay,
        zip_code: form.address.zip_code,
    })

    const provinces = useProvinces()
    const cities = useCities(form.address.province_code)
    const barangays = usePsgcBarangays(form.address.city_code)

    const onOpenChange = (next: boolean) => {
        if (next) {
            setForm({ ...emptyForm, address: emptyAddress() })
            reset()
            create.reset()
        }
        setOpen(next)
    }

    const set = (key: 'first_name' | 'last_name' | 'email' | 'phone_number') => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const setAddr = (patch: Partial<Address>) =>
        setForm((prev) => ({ ...prev, address: { ...prev.address, ...patch } }))

    const onSubmit = handleSubmit((data) => {
        create.mutate(
            {
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone_number: data.phone_number,
                address: form.address,
                is_operator: true,
            },
            { onSuccess: () => setOpen(false) },
        )
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger
                render={
                    <Button size='lg' className='cursor-pointer px-3'>
                        <Plus className='size-4' />
                        Create New Account
                    </Button>
                }
            />
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={onSubmit} className='flex flex-col gap-4'>
                    <DialogHeader>
                        <DialogTitle>Create account</DialogTitle>
                    </DialogHeader>

                    <div className='flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1'>
                        <div className='grid grid-cols-2 gap-4'>
                            <Field>
                                <FieldLabel htmlFor='new-first-name'>First name</FieldLabel>
                                <Input
                                    id='new-first-name'
                                    value={form.first_name}
                                    onChange={set('first_name')}
                                    onBlur={onBlur('first_name')}
                                />
                                <FieldError errors={fieldError('first_name')} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='new-last-name'>Last name</FieldLabel>
                                <Input
                                    id='new-last-name'
                                    value={form.last_name}
                                    onChange={set('last_name')}
                                    onBlur={onBlur('last_name')}
                                />
                                <FieldError errors={fieldError('last_name')} />
                            </Field>
                        </div>

                        <Field>
                            <FieldLabel htmlFor='new-email'>Email</FieldLabel>
                            <Input
                                id='new-email'
                                type='email'
                                value={form.email}
                                onChange={set('email')}
                                onBlur={onBlur('email')}
                            />
                            <FieldError errors={fieldError('email')} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor='new-phone'>Phone number</FieldLabel>
                            <Input
                                id='new-phone'
                                type='tel'
                                autoComplete='off'
                                placeholder='+639…'
                                value={form.phone_number}
                                onChange={set('phone_number')}
                                onBlur={onBlur('phone_number')}
                            />
                            <FieldError errors={fieldError('phone_number')} />
                        </Field>

                        <div className='flex flex-col gap-4 border-t pt-4'>
                            <p className='text-sm font-medium'>Location</p>
                            <Field>
                                <FieldLabel htmlFor='new-street'>Street</FieldLabel>
                                <Input
                                    id='new-street'
                                    placeholder='House no., street / purok'
                                    value={form.address.unit}
                                    onChange={(e) => setAddr({ unit: e.target.value })}
                                    onBlur={onBlur('street')}
                                />
                                <FieldError errors={fieldError('street')} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='new-province'>Province</FieldLabel>
                                <PlaceSelect
                                    id='new-province'
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
                                <FieldError errors={fieldError('province')} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='new-city'>City / Municipality</FieldLabel>
                                <PlaceSelect
                                    id='new-city'
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
                                <FieldError errors={fieldError('city')} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='new-barangay'>Barangay</FieldLabel>
                                <PlaceSelect
                                    id='new-barangay'
                                    value={form.address.barangay_code}
                                    displayName={form.address.barangay}
                                    options={barangays.data ?? []}
                                    loading={barangays.isFetching}
                                    disabled={!form.address.city_code}
                                    onSelect={(b) =>
                                        setAddr({ barangay_code: b.code, barangay: b.name })
                                    }
                                />
                                <FieldError errors={fieldError('barangay')} />
                            </Field>
                            <div className='grid grid-cols-2 gap-4'>
                                <Field>
                                    <FieldLabel htmlFor='new-country'>Country</FieldLabel>
                                    <Input id='new-country' value={form.address.country} disabled />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor='new-zip'>Zip code</FieldLabel>
                                    <Input
                                        id='new-zip'
                                        inputMode='numeric'
                                        placeholder='7000'
                                        value={form.address.zip_code}
                                        onChange={(e) => setAddr({ zip_code: e.target.value })}
                                        onBlur={onBlur('zip_code')}
                                    />
                                    <FieldError errors={fieldError('zip_code')} />
                                </Field>
                            </div>
                        </div>
                    </div>

                    {create.isError && (
                        <FieldDescription className='text-destructive'>
                            {(create.error as AxiosError<{ email?: string[] }> | null)?.response?.data
                                ?.email?.[0] ?? "Couldn't create the account. Check the fields and try again."}
                        </FieldDescription>
                    )}

                    <p className='text-xs text-muted-foreground'>
                        Once the account is created, an email will be sent to the user's email
                        address to complete their registration.
                    </p>

                    <DialogFooter>
                        <DialogClose render={<Button type='button' variant='outline' />}>
                            Cancel
                        </DialogClose>
                        <Button type='submit' disabled={create.isPending}>
                            {create.isPending ? 'Creating…' : 'Create account'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default CreateUserDialog
