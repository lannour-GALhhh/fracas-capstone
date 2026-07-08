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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/common/ui/select'
import { useZodForm } from '@/common/hooks/useZodForm'
import { useCreateAdminUser } from '../../hooks/useAdminUserMutations'
import { CreateUserSchema } from '../../schemas'

type ConsoleRole = 'operator' | 'admin'

const emptyForm = {
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
}

/** Provision a new operator/admin account. No email flow exists yet, so the
 * admin sets an initial password directly and relays it to the new user. */
const CreateUserDialog = () => {
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [role, setRole] = useState<ConsoleRole>('operator')
    const create = useCreateAdminUser()

    const { fieldError, onBlur, handleSubmit, reset } = useZodForm(CreateUserSchema, form)

    const onOpenChange = (next: boolean) => {
        if (next) {
            setForm(emptyForm)
            setRole('operator')
            reset()
            create.reset()
        }
        setOpen(next)
    }

    const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const onSubmit = handleSubmit((data) => {
        create.mutate(
            {
                username: data.username,
                password: data.password,
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email || undefined,
                phone_number: data.phone_number || undefined,
                is_operator: role === 'operator',
                is_staff: role === 'admin',
            },
            { onSuccess: () => setOpen(false) },
        )
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger render={<Button size='sm' />}>New account</DialogTrigger>
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={onSubmit} className='flex flex-col gap-4'>
                    <DialogHeader>
                        <DialogTitle>Create account</DialogTitle>
                        <DialogDescription>
                            Provision an operator or admin account. Share the password with them
                            directly — there is no email delivery.
                        </DialogDescription>
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
                            <FieldLabel htmlFor='new-username'>Username</FieldLabel>
                            <Input
                                id='new-username'
                                value={form.username}
                                onChange={set('username')}
                                onBlur={onBlur('username')}
                            />
                            <FieldError errors={fieldError('username')} />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='new-password'>Password</FieldLabel>
                            <Input
                                id='new-password'
                                type='text'
                                autoComplete='off'
                                value={form.password}
                                onChange={set('password')}
                                onBlur={onBlur('password')}
                            />
                            <FieldDescription>Shown in plain text — this is what you'll relay.</FieldDescription>
                            <FieldError errors={fieldError('password')} />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='new-email'>
                                Email <span className='text-black/40'>(optional)</span>
                            </FieldLabel>
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
                            <FieldLabel htmlFor='new-phone'>
                                Phone number <span className='text-black/40'>(optional)</span>
                            </FieldLabel>
                            <Input
                                id='new-phone'
                                type='tel'
                                placeholder='+639…'
                                value={form.phone_number}
                                onChange={set('phone_number')}
                                onBlur={onBlur('phone_number')}
                            />
                            <FieldError errors={fieldError('phone_number')} />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='new-role'>Console role</FieldLabel>
                            <Select id='new-role' value={role} onValueChange={(v) => setRole(v as ConsoleRole)}>
                                <SelectTrigger className='w-full'>
                                    <SelectValue>
                                        {(v) => (v === 'admin' ? 'Admin' : 'Operator')}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='operator'>Operator</SelectItem>
                                    <SelectItem value='admin'>Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    {create.isError && (
                        <FieldDescription className='text-destructive'>
                            Couldn't create the account. Check the fields and try again.
                        </FieldDescription>
                    )}

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
