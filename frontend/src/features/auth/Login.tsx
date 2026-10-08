import { useActionState, useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { Eye, EyeClosed, User, Lock } from 'lucide-react'
import { LoginSchema } from './schemas/LoginSchema'
import { Field, FieldSet, FieldLabel, FieldGroup, FieldDescription } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import { Checkbox } from '@/common/ui/checkbox'
import CityMap from './components/CityMap'
import { useAuth } from './context/useAuth'
import type { LoginState } from './types/authTypes'
import { Link, useNavigate } from 'react-router-dom'

/** Turn a failed sign-in into one plain-language line for the operator. */
const humanizeLoginError = (err: unknown): string => {
	if (err instanceof AxiosError) {
		if (err.response?.status === 401) return "We couldn't find an account with those credentials, please try again."
		if (!err.response) return "We couldn't reach the server. Check your connection and try again."
	}
	return 'Something went wrong signing you in. Please try again.'
}

const Login = () => {

	const { isAuthenticated, login } = useAuth();
	const navigate = useNavigate();

	// Controlled so a failed submit doesn't reset the inputs.
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState<boolean>(false);

	const initialState: LoginState = {errors: {}};

	const loginAction = async (_: LoginState, formData: FormData): Promise<LoginState> => {

		const raw = Object.fromEntries(formData);
		const parsed = LoginSchema.safeParse(raw);

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;

			return {
				errors: {
					username: fieldErrors.username?.[0],
					password: fieldErrors.password?.[0],
				}
			};
		};

		try {
			await login({
				username: parsed.data.username,
				password: parsed.data.password
			});

			return initialState;
		} catch (err) {
			return { errors: {}, formError: humanizeLoginError(err) };
		}
	}

	const toggleShowPassword = (): void => setShowPassword(prev => !prev);

	const [state, formAction, isPending] = useActionState(loginAction, initialState);

	useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate])

	return (
		<div className='flex h-screen w-full bg-white'>
			<form className='flex flex-1 flex-col items-center px-6 py-8' action={formAction}>
				<div className='flex w-full max-w-sm flex-1 flex-col justify-center gap-8'>
					<div className='flex flex-col gap-2 text-blue-950'>
						<h1 className='text-3xl font-semibold tracking-tight'>Welcome Back</h1>
						<FieldDescription>Continue to access your dashboard</FieldDescription>
					</div>

					<FieldSet>
						{state.formError &&
							<div role='alert' className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
								{state.formError}
							</div>
						}
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor='username'>Username</FieldLabel>
								<div className='relative'>
									<User className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
									<Input
										id='username'
										name='username'
										autoComplete='username'
										placeholder='Enter your username'
										autoFocus
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										aria-invalid={!!state.errors.username}
										className='h-11 rounded-xl pl-10'
									/>
								</div>
								{state.errors.username &&
									<FieldDescription className='text-destructive'>{state.errors.username}</FieldDescription>
								}
							</Field>
							<Field>
								<FieldLabel htmlFor='password'>Password</FieldLabel>
								<div className='relative'>
									<Lock className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
									<Input
										id='password'
										type={showPassword ? 'text' : 'password'}
										name='password'
										autoComplete='current-password'
										placeholder='Enter your password'
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										aria-invalid={!!state.errors.password}
										className='h-11 rounded-xl px-10'
									/>
									<button
										type='button'
										onClick={toggleShowPassword}
										aria-label={showPassword ? 'Hide password' : 'Show password'}
										className='absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground'
									>
										{showPassword ? <EyeClosed className='size-4' /> : <Eye className='size-4' />}
									</button>
								</div>
								{state.errors.password &&
									<FieldDescription className='text-destructive'>{state.errors.password}</FieldDescription>
								}
							</Field>
							<div className='flex items-center justify-between'>
								<label htmlFor='remember' className='flex cursor-pointer items-center gap-2 text-sm'>
									<Checkbox id='remember' name='remember' />
									Remember me
								</label>
								<Button type='button' variant='link' nativeButton={false} render={<Link to='/forgot-password' />} className='h-auto p-0 text-sm underline'>Forgot Password?</Button>
							</div>
						</FieldGroup>
						<Button type='submit' disabled={isPending} className='h-12 w-full cursor-pointer rounded-full text-base'>
							{isPending ? 'Signing in…' : 'Log In'}
						</Button>
					</FieldSet>
				</div>
			</form>

			{/* Enlarged past the panel, pinned left, slightly above the bottom; the top/right run off. */}
			<div className='relative hidden basis-3/5 overflow-hidden border-l border-slate-100 bg-white md:block'>
				<CityMap className='absolute inset-0 size-full' />
				{/* Wordmark floats over the map on a white glow that fades to nothing; clicks and hovers pass through. */}
				<div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
					<div
						className='px-24 py-16'
						style={{ background: 'radial-gradient(closest-side, white 25%, transparent 100%)' }}
					>
						<div className='flex flex-col items-center gap-2 text-blue-950'>
							<span className='text-4xl font-bold tracking-tight'>FRACAS</span>
							<hr className='w-full border-t border-blue-950/40' />
							<span className='text-sm font-medium uppercase tracking-[0.3em]'>Zamboanga City</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Login
