import type {AxiosError} from 'axios'
import type { UserRole } from '@/app/decodeJwt'
import type { LoginSchemaType } from '../schemas/LoginSchema'

export interface Login {
    username: string,
    password: string,
}

export interface AuthContextType {
    isAuthenticated: boolean,
    /** Console role, read from the access token's `role` claim. */
    role: UserRole,
    /** True for operators and admins — gates operator-only console UI. */
    isOperator: boolean,
    /** True for admins only — gates system-admin UI. */
    isAdmin: boolean,
    isInitializing: boolean,
    error: AxiosError | null,
    login: (credentials: Login) => Promise<void>,
    logout: () => Promise<void>
}

export type LoginState = {
    errors: Partial<Record<keyof LoginSchemaType, string>>,
    formError?: string,
}