import { useState } from 'react'
import { AxiosError } from 'axios'
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
import { useChangePassword } from '../hooks/useCurrentUser'
import { PasswordChangeSchema } from '../schemas'

const EMPTY = { current_password: '', new_password: '', confirm: '' }

/** Flatten djoser's `{field: [msg]}` 400 body into a single readable line. */
const errorMessage = (error: unknown): string => {
    if (error instanceof AxiosError && error.response?.status === 400) {
        const data = error.response.data as Record<string, string[] | string>
        const first = Object.values(data)[0]
        if (Array.isArray(first)) return first[0]
        if (typeof first === 'string') return first
    }
    return 'Couldn’t change your password. Please try again.'
}

/** Change the account password via djoser `set_password`. */
const ChangePasswordDialog = () => {
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState(EMPTY)
    const change = useChangePassword()
    const { fieldError, onBlur, handleSubmit, reset } = useZodForm(PasswordChangeSchema, form)

    const onOpenChange = (next: boolean) => {
        if (next) {
            setForm(EMPTY)
            reset()
            change.reset()
        }
        setOpen(next)
    }

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const onSubmit = handleSubmit((data) => {
        change.mutate(
            { current_password: data.current_password, new_password: data.new_password },
            { onSuccess: () => setOpen(false) },
        )
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger render={<Button variant="outline" />}>
                Change Password
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle>Change password</DialogTitle>
                        <DialogDescription>
                            Enter your current password, then choose a new one.
                        </DialogDescription>
                    </DialogHeader>

                    <Field>
                        <FieldLabel htmlFor="current_password">Current password</FieldLabel>
                        <Input
                            id="current_password"
                            type="password"
                            autoComplete="current-password"
                            value={form.current_password}
                            onChange={set('current_password')}
                            onBlur={onBlur('current_password')}
                        />
                        <FieldError errors={fieldError('current_password')} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="new_password">New password</FieldLabel>
                        <Input
                            id="new_password"
                            type="password"
                            autoComplete="new-password"
                            value={form.new_password}
                            onChange={set('new_password')}
                            onBlur={onBlur('new_password')}
                        />
                        <FieldError errors={fieldError('new_password')} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="confirm">Confirm new password</FieldLabel>
                        <Input
                            id="confirm"
                            type="password"
                            autoComplete="new-password"
                            value={form.confirm}
                            onChange={set('confirm')}
                            onBlur={onBlur('confirm')}
                        />
                        <FieldError errors={fieldError('confirm')} />
                    </Field>

                    {change.isError && (
                        <FieldDescription className="text-red-500">
                            {errorMessage(change.error)}
                        </FieldDescription>
                    )}

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" />}>
                            Cancel
                        </DialogClose>
                        <Button type="submit" disabled={change.isPending}>
                            {change.isPending ? 'Updating…' : 'Update password'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default ChangePasswordDialog
