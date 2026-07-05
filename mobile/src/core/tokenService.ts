/**
 * Token storage. The short-lived access token lives in memory only (never
 * persisted); the refresh token is kept in the OS keychain via expo-secure-store
 * so the session survives an app restart. Mirrors the web `tokenService`, plus
 * async refresh accessors (the web keeps its refresh in an HttpOnly cookie).
 */
import * as SecureStore from 'expo-secure-store'

const REFRESH_KEY = 'fracas.refresh'

let accessToken: string | null = null

export const tokenService = {
    getAccess: (): string | null => accessToken,
    setAccess: (token: string | null): void => {
        accessToken = token
    },
    clearAccess: (): void => {
        accessToken = null
    },

    getRefresh: (): Promise<string | null> => SecureStore.getItemAsync(REFRESH_KEY),
    saveRefresh: (token: string): Promise<void> => SecureStore.setItemAsync(REFRESH_KEY, token),
    clearRefresh: (): Promise<void> => SecureStore.deleteItemAsync(REFRESH_KEY),
}
