import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Waves } from 'lucide-react'
import { toast } from 'sonner'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import { useZodForm } from '@/common/hooks/useZodForm'
import { completeActivation, verifyActivation } from './api/activationApi'
import { ActivationSchema } from './schemas/ActivationSchema'

/** Field-level server rejections (username taken, password policy) keyed by field. */
const fieldErrorsFrom = (err: unknown): Record<string, string[]> => {
    if (!(err instanceof AxiosError)) return {}
    const data = err.response?.data ?? {}
    return Object.fromEntries(
        ['username', 'new_password'].filter((k) => data[k]?.length).map((k) => [k, data[k]]),
    )
}

/** Banner text for failures that aren't tied to a field. */
const humanizeError = (err: unknown): string =>
    err instanceof AxiosError && !err.response
        ? "We couldn't reach the server. Check your connection and try again."
        : 'This activation link is invalid or has expired.'

const Shell = ({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) => (
    <div className='flex min-h-screen w-full items-center justify-center bg-blue-950 p-2'>
        <div className='flex w-full max-w-sm flex-col gap-8 rounded-2xl bg-white p-8'>
            <div className='flex flex-col gap-3'>
                <span className='flex size-12 items-center justify-center rounded-xl bg-blue-950'>
                    <Waves className='size-6 text-blue-200' />
                </span>
                <div>
                    <h1 className='text-2xl font-bold tracking-tight text-blue-950'>{title}</h1>
                    <FieldDescription className='mt-1'>{subtitle}</FieldDescription>
                </div>
            </div>
            {children}
        </div>
    </div>
)

/** Landing page for the emailed activation link: verify it, set a password, go sign in. */
const AccountActivation = () => {
    const { token = '' } = useParams()
    const navigate = useNavigate()
    const [form, setForm] = useState({ username: undefined as string | undefined, new_password: '', confirm: '' })
    const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({})
    const [pending, setPending] = useState(false)
    const [error, setError] = useState('')

    const link = useQuery({
        queryKey: ['account-activation', token],
        queryFn: () => verifyActivation(token),
        retry: false,
        staleTime: Infinity,
    })

    // Prefill with the generated suggestion until the user types their own.
    const values = { ...form, username: form.username ?? link.data?.suggested_username ?? '' }
    const { fieldError, onBlur, handleSubmit } = useZodForm(ActivationSchema, values)

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }))
        setServerErrors((prev) => ({ ...prev, [key]: [] }))
    }

    // Local errors first, then whatever the server rejected for that field.
    const errorsFor = (name: 'username' | 'new_password' | 'confirm') =>
        fieldError(name) ??
        (serverErrors[name]?.length ? serverErrors[name].map((message) => ({ message })) : undefined)

    const onSubmit = handleSubmit(async (data) => {
        setPending(true)
        setError('')
        setServerErrors({})
        try {
            await completeActivation({
                token,
                username: data.username,
                new_password: data.new_password,
            })
            toast.success('Account activated', {
                description: `Sign in as ${data.username} with your new password.`,
            })
            navigate('/login', { replace: true })
        } catch (err) {
            const fields = fieldErrorsFrom(err)
            setServerErrors(fields)
            if (!Object.keys(fields).length) setError(humanizeError(err))
            setPending(false)
        }
    })

    if (link.isPending) {
        return <Shell title='Checking your link…' subtitle='One moment.' />
    }
    if (link.isError) {
        return (
            <Shell
                title='Link unavailable'
                subtitle='This activation link is invalid, expired, or already used. Ask an administrator to send you a new one.'
            >
                <Button size='lg' nativeButton={false} render={<Link to='/login' />} className='w-full'>
                    Go to sign in
                </Button>
            </Shell>
        )
    }

    return (
        <Shell
            title={`Welcome, ${link.data.first_name || link.data.suggested_username}`}
            subtitle='Choose your username and password to activate your account.'
        >
            <form onSubmit={onSubmit} className='flex flex-col gap-6'>
                {error && (
                    <div
                        role='alert'
                        className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
                    >
                        {error}
                    </div>
                )}
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor='username'>Username</FieldLabel>
                        <Input
                            id='username'
                            autoComplete='username'
                            autoFocus
                            value={values.username}
                            onChange={set('username')}
                            onBlur={onBlur('username')}
                        />
                        <FieldError errors={errorsFor('username')} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor='new-password'>New password</FieldLabel>
                        <Input
                            id='new-password'
                            type='password'
                            autoComplete='new-password'
                            value={form.new_password}
                            onChange={set('new_password')}
                            onBlur={onBlur('new_password')}
                        />
                        <FieldError errors={errorsFor('new_password')} />
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
                        <FieldError errors={errorsFor('confirm')} />
                    </Field>
                </FieldGroup>
                <Button size='lg' type='submit' disabled={pending} className='w-full'>
                    {pending ? 'Activating…' : 'Activate account'}
                </Button>
            </form>
        </Shell>
    )
}

export default AccountActivation
