import { type ReactNode, useCallback, useEffect, useState } from 'react'

import { decodeJwt } from '@/core/decodeJwt'
import { sessionEvents } from '@/core/sessionEvents'
import { tokenService } from '@/core/tokenService'
import type { Role } from '@/common/types/Role'

import { login as loginRequest, refreshAccess } from '../api/authApi'
import type { AuthContextType, LoginCredentials, TokenPair } from '../types/authTypes'
import { AuthContext } from './authContext'

/**
 * Session provider. Mirrors the web `AuthProvider`: access token in memory,
 * `role` derived from its claims, a cold-start refresh, and a session-expired
 * subscription. The refresh token lives in SecureStore (not a cookie).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setAuthenticated] = useState(false)
    const [role, setRole] = useState<Role>('resident')
    const [isInitializing, setInitializing] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const applyAccess = useCallback((access: string) => {
        tokenService.setAccess(access)
        setRole(decodeJwt(access)?.role ?? 'resident')
        setAuthenticated(true)
    }, [])

    const clearAuth = useCallback(() => {
        tokenService.clearAccess()
        void tokenService.clearRefresh()
        setRole('resident')
        setAuthenticated(false)
    }, [])

    const applyTokens = useCallback(
        async ({ access, refresh }: TokenPair) => {
            await tokenService.saveRefresh(refresh)
            applyAccess(access)
        },
        [applyAccess],
    )

    // Cold start: validate a stored refresh token, otherwise stay logged out.
    useEffect(() => {
        const initialize = async () => {
            try {
                const refresh = await tokenService.getRefresh()
                if (!refresh) throw new Error('No stored session')
                applyAccess(await refreshAccess(refresh))
            } catch {
                clearAuth()
            } finally {
                setInitializing(false)
            }
        }
        void initialize()
    }, [applyAccess, clearAuth])

    // A failed refresh (from apiClient) ends the session.
    useEffect(() => sessionEvents.onExpired(clearAuth), [clearAuth])

    const login = useCallback(
        async (credentials: LoginCredentials) => {
            setError(null)
            try {
                await applyTokens(await loginRequest(credentials))
            } catch (err) {
                setError('Incorrect phone number or password.')
                throw err
            }
        },
        [applyTokens],
    )

    const logout = useCallback(async () => {
        clearAuth()
    }, [clearAuth])

    const value: AuthContextType = {
        isAuthenticated,
        role,
        isInitializing,
        error,
        login,
        logout,
        applyTokens,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
