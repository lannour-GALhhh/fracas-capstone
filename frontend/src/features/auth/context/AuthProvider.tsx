import React, {useState, useEffect, useCallback} from 'react'
import { AxiosError } from 'axios'
import tokenService from '@/app/tokenService'
import { loginRequest, refreshRequest } from '@/app/authRequests'
import { decodeJwt, type UserRole } from '@/app/decodeJwt'
import type { Login, AuthContextType } from '../types/authTypes'
import { AuthContext } from './authContext'

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [isAuthenticated, setAuthenticated] = useState<boolean>(false);
    const [role, setRole] = useState<UserRole>('resident');
    const [isInitializing, setInitializing] = useState<boolean>(true);
    const [error, setError] = useState<AxiosError | null>(null);

    /** Store the access token and derive session state from its claims. */
    const applyAccess = useCallback((access: string): void => {
        tokenService.setAccess(access);
        setRole(decodeJwt(access)?.role ?? 'resident');
        setAuthenticated(true);
    }, []);

    const clearAuth = useCallback((): void => {
        tokenService.clear();
        setRole('resident');
        setAuthenticated(false);
    }, []);

    useEffect(() => {
        const initializeAuth = async (): Promise<void> => {
            setInitializing(true);
            try {
                applyAccess(await refreshRequest());
            } catch {
                clearAuth();
            } finally {
                setInitializing(false);
            }
        };

        initializeAuth();
    }, [applyAccess, clearAuth]);

    useEffect(() => {
        window.addEventListener('fracas:session-expired', clearAuth);
        return () => window.removeEventListener('fracas:session-expired', clearAuth);
    }, [clearAuth]);

    const login = async (credentials: Login): Promise<void> => {
        setError(null);

        try {
            applyAccess(await loginRequest(credentials));
        } catch (error) {
            setError(error as AxiosError);
            throw error;
        }
    }

    const logout = async (): Promise<void> => {
        clearAuth();
    }

    const value: AuthContextType = {
        isAuthenticated,
        role,
        // Admins are a superset of operators, so operator-gated UI admits both.
        isOperator: role === 'operator' || role === 'admin',
        isAdmin: role === 'admin',
        isInitializing,
        error,
        login,
        logout,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}