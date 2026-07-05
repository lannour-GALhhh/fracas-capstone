/**
 * Auth endpoints. Uses a raw axios call (not the shared `apiClient`) so the
 * 401-refresh interceptor never runs during login/refresh itself.
 */
import axios from 'axios'

import { API_BASE_URL } from '@/core/config'

import type { LoginCredentials, TokenPair } from '../types/authTypes'

const MOBILE_HEADERS = { 'X-Client': 'mobile' }

/** Exchange credentials for an access + refresh pair (both in the body for mobile). */
export async function login(credentials: LoginCredentials): Promise<TokenPair> {
    const { data } = await axios.post<TokenPair>(
        `${API_BASE_URL}/api/auth/jwt/create/`,
        credentials,
        { headers: MOBILE_HEADERS },
    )
    return data
}

/** Validate a stored refresh token on cold start, returning a fresh access token. */
export async function refreshAccess(refresh: string): Promise<string> {
    const { data } = await axios.post<{ access: string }>(
        `${API_BASE_URL}/api/auth/jwt/refresh/`,
        { refresh },
        { headers: MOBILE_HEADERS },
    )
    return data.access
}
