/**
 * Runtime config. The API base points at the nginx-fronted backend.
 *
 * On a physical device `localhost` is the phone itself, so set
 * `EXPO_PUBLIC_API_URL` to a LAN-reachable host (e.g. http://192.168.1.10) in
 * `.env` before running `expo start`.
 */
const raw = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost'

export const API_BASE_URL = raw.replace(/\/+$/, '')
