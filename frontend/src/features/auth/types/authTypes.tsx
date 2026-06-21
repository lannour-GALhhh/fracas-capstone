import type {AxiosError} from 'axios'
import type { LoginSchemaType } from '../schemas/LoginSchema'

export interface Login {
    username: string,
    password: string,
}

export interface AuthContextType {
    isAuthenticated: boolean,
    isInitializing: boolean,
    error: AxiosError | null,
    login: (credentials: Login) => Promise<void>,
    logout: () => Promise<void>
}

export type LoginState = {
    errors: Partial<Record<keyof LoginSchemaType, string>>,
    formError?: string
}