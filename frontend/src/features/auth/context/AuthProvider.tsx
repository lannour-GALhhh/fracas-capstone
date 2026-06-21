import React, {useState, useEffect} from 'react'
import axios, { AxiosError } from 'axios'
import tokenService from '@/app/tokenService'
import apiClient from '@/app/apiClient'
import type { Login, AuthContextType } from '../types/authTypes'
import { AuthContext } from './authContext'

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [isAuthenticated, setAuthenticated] = useState<boolean>(false);
    const [isInitializing, setInitializing] = useState<boolean>(false);
    const [error, setError] = useState<AxiosError | null>(null);

    useEffect(() => {
        const initializeAuth = async (): Promise<void> => {
            setInitializing(true);
            try {
                const { data } = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/auth/jwt/refresh/`,
                    {},
                    { withCredentials: true }
                );
                tokenService.setAccess(data);
                setAuthenticated(true);
            } catch {
                setAuthenticated(false);
            } finally {
                setInitializing(false);
            }
        };

        initializeAuth();
    }, []);

    useEffect(() => {
        const handleExpired = (): void => {
            tokenService.clearAccess();
            setAuthenticated(false);
        }

        window.addEventListener('fracas:session-expired', handleExpired);
        return () => window.removeEventListener('fracas:session-expired', handleExpired);
    }, []);

    const login = async (credentials: Login): Promise<void> => {
        setError(null);
        
        try {
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/jwt/create/`, 
                credentials,
                { withCredentials: true }
            );

            tokenService.setAccess(data.access);
            setAuthenticated(true);
        } catch (error) {
            setError(error as AxiosError);
        }
    }

    const logout = async (): Promise<void> => {
        try {
            await apiClient.post('/api/auth/logout/', {}, { withCredentials: true });
        } finally {
            tokenService.clearAccess();
            setAuthenticated(false);
        }
    }

    const value: AuthContextType = {
        isAuthenticated,
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