import { useActionState, useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { Map, Megaphone, History, Waves } from 'lucide-react'
import { LoginSchema } from './schemas/LoginSchema'
import { Field, FieldSet, FieldLabel, FieldGroup, FieldDescription } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import { Stagger, StaggerItem } from '@/common/motion'
import { useAuth } from './context/useAuth'
import type { LoginState } from './types/authTypes'
import { useNavigate } from 'react-router-dom'

/** Turn a failed sign-in into one plain-language line for the operator. */
const humanizeLoginError = (err: unknown): string => {
	if (err instanceof AxiosError) {
		if (err.response?.status === 401) return "We couldn't find an account with those credentials, please try again."
		if (!err.response) return "We couldn't reach the server. Check your connection and try again."
	}
	return 'Something went wrong signing you in. Please try again.'
}

const FEATURES = [
	{ icon: Map, title: 'Live risk map', desc: 'Barangay flood hazard, refreshed every 15 minutes.' },
	{ icon: Megaphone, title: 'Instant advisories', desc: 'Broadcast alerts to subscribers the moment risk turns critical.' },
	{ icon: History, title: 'Flood history', desc: 'A searchable record of past events that validates the model.' },
]

const Login = () => {

	const { isAuthenticated, login } = useAuth();
	const navigate = useNavigate();

	// Controlled fields: a form action resets uncontrolled inputs after it
	// runs, so we own the values here to keep them on a failed attempt.
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');

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

	const [state, formAction, isPending] = useActionState(loginAction, initialState);

	useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate])

	return (
		<div className='bg-blue-950 w-full h-screen flex p-2'>
			<div className='hidden basis-2/5 items-center justify-center p-10 md:flex'>
				<Stagger className='flex max-w-sm flex-col gap-8 text-white'>
					<StaggerItem className='flex items-center gap-3'>
						<span className='flex size-11 items-center justify-center rounded-xl bg-white/10'>
							<Waves className='size-6 text-blue-200' />
						</span>
						<div>
							<p className='text-2xl font-bold tracking-tight'>FRACAS</p>
							<p className='text-sm text-blue-200/80'>Flood-risk early-warning for Zamboanga City</p>
						</div>
					</StaggerItem>
					<div className='flex flex-col gap-5'>
						{FEATURES.map(({ icon: Icon, title, desc }) => (
							<StaggerItem key={title} className='flex gap-3'>
								<Icon className='mt-0.5 size-5 shrink-0 text-blue-300' />
								<div>
									<p className='text-sm font-semibold'>{title}</p>
									<p className='text-sm text-blue-200/70'>{desc}</p>
								</div>
							</StaggerItem>
						))}
					</div>
				</Stagger>
			</div>

			<form className='flex-1 bg-white rounded-2xl flex items-center justify-center flex-col p-6' action={formAction}>
				<div className='flex w-full max-w-sm flex-col gap-8'>
					<div className='flex flex-col gap-3'>
						{/* Brand mark — also gives mobile a logo, since the left panel is hidden there. */}
						<span className='flex size-12 items-center justify-center rounded-xl bg-blue-950 md:hidden'>
							<Waves className='size-6 text-blue-200' />
						</span>
						<div>
							<h1 className='text-2xl font-bold tracking-tight text-blue-950'>Welcome back</h1>
							<FieldDescription className='mt-1'>Sign in to your FRACAS account to continue.</FieldDescription>
						</div>
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
								<Input
									id='username'
									name='username'
									autoComplete='username'
									autoFocus
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									aria-invalid={!!state.errors.username}
								/>
								{state.errors.username &&
									<FieldDescription className='text-destructive'>{state.errors.username}</FieldDescription>
								}
							</Field>
							<Field>
								<div className='flex items-center justify-between'>
									<FieldLabel htmlFor='password'>Password</FieldLabel>
									<Button type='button' variant='link' className='h-auto p-0 text-xs'>Forgot password?</Button>
								</div>
								<Input
									id='password'
									type='password'
									name='password'
									autoComplete='current-password'
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									aria-invalid={!!state.errors.password}
								/>
								{state.errors.password &&
									<FieldDescription className='text-destructive'>{state.errors.password}</FieldDescription>
								}
							</Field>
						</FieldGroup>
						<Button size='lg' type='submit' disabled={isPending} className='w-full cursor-pointer'>
							{isPending ? 'Signing in…' : 'Log In'}
						</Button>
					</FieldSet>

					<FieldDescription className='text-center text-xs'>
						Authorized personnel — Zamboanga City DRRMO
					</FieldDescription>
				</div>
			</form>
		</div>
	)
}

export default Login
