import axios from 'axios'
import tokenService from './tokenService'

const BASE_URL = import.meta.env.VITE_API_URL
// X-Client tells the API to return the refresh token in the body (no cookie).
const headers = { 'X-Client': 'web' }

interface Credentials { username: string; password: string }

/** Exchange credentials for tokens and persist them. Returns the access token. */
export const loginRequest = async (credentials: Credentials): Promise<string> => {
    const { data } = await axios.post(`${BASE_URL}/api/auth/jwt/create/`, credentials, { headers })
    tokenService.setAccess(data.access)
    tokenService.setRefresh(data.refresh)
    return data.access
}

/** Use the stored refresh token to get a new access token. Throws when none/invalid. */
export const refreshRequest = async (): Promise<string> => {
    const refresh = tokenService.getRefresh()
    if (!refresh) throw new Error('No refresh token')
    const { data } = await axios.post(`${BASE_URL}/api/auth/jwt/refresh/`, { refresh }, { headers })
    tokenService.setAccess(data.access)
    if (data.refresh) tokenService.setRefresh(data.refresh)
    return data.access
}
