import {useActionState, useEffect} from 'react'
import { LoginSchema } from './schemas/LoginSchema'
import { Field, FieldSet, FieldLabel, FieldGroup, FieldDescription } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import { useAuth } from './context/useAuth'
import type { LoginState } from './types/authTypes'
import { useNavigate } from 'react-router-dom'

const Login = () => {

	const { isAuthenticated, login } = useAuth();
	const navigate = useNavigate();

	const initialState: LoginState = {errors: {}};

	const loginAction = async (_: LoginState, formData: FormData): Promise<LoginState> => {

		const parsed = LoginSchema.safeParse(Object.fromEntries(formData));

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
			console.log(err);
			return { errors: {}};
		}
	}

	const [state, formAction, isPending] = useActionState(loginAction, initialState);

	useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate])

	return (
		<div className='bg-blue-950 w-full h-screen flex p-2'>
			<div className='flex items-center justify-center basis-2/5'>
				
			</div>

			<form className='flex-1 bg-white rounded-2xl flex items-center justify-center flex-col' action={formAction}>
				<FieldSet className='w-1/3'>
					<h1>Welcome to FRACAS</h1>
					<FieldDescription>Login to your FRACAS account</FieldDescription>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor='username'>Username</FieldLabel>
								<Input id='username' name='username' />
								{state.errors.username &&
									<FieldDescription className='text-red-400'>{state.errors.username}</FieldDescription>
								}
							</Field>
							<Field>
								<FieldLabel htmlFor='password'>Password</FieldLabel>
								<Input id='password' type='password' name='password'  />
								{state.errors.password &&
									<FieldDescription className='text-red-400'>{state.errors.password}</FieldDescription>
								}
							</Field>
						</FieldGroup>
						<Button size="lg" type='submit' disabled={isPending} className="cursor-pointer">Log In</Button>
						<Button type='button' className="ml-auto" variant="link">Forgot Password?</Button>
				</FieldSet>
			</form>
		</div>
	)
}

export default Login
