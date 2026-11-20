/**
 * Runtime config. The API base points at the nginx-fronted backend.
 *
 * TEMPORARY: the server URL is hardcoded (no .env / EAS env) so an
 * `eas update` can't pick up a stale value. Restore the EXPO_PUBLIC_API_URL
 * lookup once env handling is sorted out.
 */
const trim = (url: string): string => url.replace(/\/+$/, '')

const SERVER_URL = 'https://fracas-capstone.eastasia.cloudapp.azure.com'

export const API_BASE_URL = trim(SERVER_URL)

// Same server; failover is a no-op while primary === fallback.
export const API_FALLBACK_URL: string | null = trim(SERVER_URL)
