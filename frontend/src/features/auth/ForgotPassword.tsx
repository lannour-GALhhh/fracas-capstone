import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import { useZodForm } from '@/common/hooks/useZodForm'
import AuthShell from './components/AuthShell'
import { requestPasswordReset } from './api/passwordResetApi'
import { ForgotPasswordSchema } from './schemas/PasswordResetSchema'

const BackToSignIn = () => (
    <Button size='lg' variant='outline' nativeButton={false} render={<Link to='/login' />} className='w-full'>
        Back to sign in
    </Button>
)

/** Ask for a password-reset email. */
const ForgotPassword = () => {
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const [pending, setPending] = useState(false)
    const [error, setError] = useState('')
    const { fieldError, onBlur, handleSubmit } = useZodForm(ForgotPasswordSchema, { email })

    const onSubmit = handleSubmit(async (data) => {
        setPending(true)
        setError('')
        try {
            await requestPasswordReset(data.email)
            setSent(true)
        } catch (err) {
            setError(
                err instanceof AxiosError && !err.response
                    ? "We couldn't reach the server. Check your connection and try again."
                    : 'Something went wrong. Please try again.',
            )
            setPending(false)
        }
    })

    if (sent) {
        return (
            <AuthShell
                title='Check your email'
                subtitle={`We've sent a link to ${email.trim()} to reset your password. It expires in 1 hour.`}
            >
                <BackToSignIn />
            </AuthShell>
        )
    }

    return (
        <AuthShell title='Forgot password?' subtitle="Enter your account email and we'll send you a reset link.">
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
                        <FieldLabel htmlFor='email'>Email</FieldLabel>
                        <Input
                            id='email'
                            type='email'
                            autoComplete='email'
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={onBlur('email')}
                        />
                        <FieldError errors={fieldError('email')} />
                    </Field>
                </FieldGroup>
                <div className='flex flex-col gap-2'>
                    <Button size='lg' type='submit' disabled={pending} className='w-full'>
                        {pending ? 'Sending…' : 'Send reset link'}
                    </Button>
                    <BackToSignIn />
                </div>
            </form>
        </AuthShell>
    )
}

export default ForgotPassword
