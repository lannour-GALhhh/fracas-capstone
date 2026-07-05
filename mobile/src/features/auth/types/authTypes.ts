import type { Role } from '@/common/types/Role'

export interface LoginCredentials {
    /** The account username — for residents, the normalized `+63…` phone. */
    username: string
    password: string
}

export interface TokenPair {
    access: string
    refresh: string
}

export interface AuthContextType {
    isAuthenticated: boolean
    role: Role
    /** True while the stored refresh token is being validated on cold start. */
    isInitializing: boolean
    error: string | null
    login: (credentials: LoginCredentials) => Promise<void>
    logout: () => Promise<void>
    /** Adopt a token pair from the registration flow (skips a second login). */
    applyTokens: (tokens: TokenPair) => Promise<void>
}
