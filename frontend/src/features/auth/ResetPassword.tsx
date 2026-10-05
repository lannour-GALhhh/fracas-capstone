import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import { useZodForm } from '@/common/hooks/useZodForm'
import AuthShell from './components/AuthShell'
import { confirmPasswordReset } from './api/passwordResetApi'
import { ResetPasswordSchema } from './schemas/PasswordResetSchema'

/** Landing page for the emailed reset link: choose a new password, then sign in. */
const ResetPassword = () => {
    const { uid = '', token = '' } = useParams()
    const navigate = useNavigate()
    const [form, setForm] = useState({ new_password: '', confirm: '' })
    const [serverErrors, setServerErrors] = useState<string[]>([])
    const [linkInvalid, setLinkInvalid] = useState(false)
    const [networkError, setNetworkError] = useState(false)
    const [pending, setPending] = useState(false)
    const { fieldError, onBlur, handleSubmit } = useZodForm(ResetPasswordSchema, form)

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }))
        if (key === 'new_password') setServerErrors([])
    }

    const passwordErrors =
        fieldError('new_password') ??
        (serverErrors.length ? serverErrors.map((message) => ({ message })) : undefined)

    const onSubmit = handleSubmit(async (data) => {
        setPending(true)
        setNetworkError(false)
        setServerErrors([])
        try {
            await confirmPasswordReset({ uid, token, new_password: data.new_password })
            toast.success('Password updated', { description: 'Sign in with your new password.' })
            navigate('/login', { replace: true })
        } catch (err) {
            const body = err instanceof AxiosError ? err.response?.data : undefined
            if (body?.new_password?.length) setServerErrors(body.new_password)
            else if (err instanceof AxiosError && !err.response) setNetworkError(true)
            else setLinkInvalid(true)
            setPending(false)
        }
    })

    if (linkInvalid) {
        return (
            <AuthShell
                title='Link unavailable'
                subtitle='This reset link is invalid, expired, or already used. Request a new one to continue.'
            >
                <Button size='lg' nativeButton={false} render={<Link to='/forgot-password' />} className='w-full'>
                    Request a new link
                </Button>
            </AuthShell>
        )
    }

    return (
        <AuthShell title='Choose a new password' subtitle='Pick a password you have not used elsewhere.'>
            <form onSubmit={onSubmit} className='flex flex-col gap-6'>
                {networkError && (
                    <div
                        role='alert'
                        className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
                    >
                        We couldn't reach the server. Check your connection and try again.
                    </div>
                )}
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor='new-password'>New password</FieldLabel>
                        <Input
                            id='new-password'
                            type='password'
                            autoComplete='new-password'
                            autoFocus
                            value={form.new_password}
                            onChange={set('new_password')}
                            onBlur={onBlur('new_password')}
                        />
                        <FieldError errors={passwordErrors} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor='confirm-password'>Confirm password</FieldLabel>
                        <Input
                            id='confirm-password'
                            type='password'
                            autoComplete='new-password'
                            value={form.confirm}
                            onChange={set('confirm')}
                            onBlur={onBlur('confirm')}
                        />
                        <FieldError errors={fieldError('confirm')} />
                    </Field>
                </FieldGroup>
                <Button size='lg' type='submit' disabled={pending} className='w-full'>
                    {pending ? 'Saving…' : 'Reset password'}
                </Button>
            </form>
        </AuthShell>
    )
}

export default ResetPassword
