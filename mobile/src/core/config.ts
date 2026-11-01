/**
 * Runtime config. The API base points at the nginx-fronted backend.
 *
 * On a physical device `localhost` is the phone itself, so set
 * `EXPO_PUBLIC_API_URL` to a LAN-reachable host (e.g. http://192.168.1.10) in
 * `.env` before running `expo start`.
 *
 * `EXPO_PUBLIC_API_FALLBACK_URL` is used (see `failover.ts`) when the primary
 * can't be reached.
 */
const trim = (url: string): string => url.replace(/\/+$/, '')

export const API_BASE_URL = trim(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost')

const fallback = process.env.EXPO_PUBLIC_API_FALLBACK_URL
export const API_FALLBACK_URL = fallback ? trim(fallback) : null
