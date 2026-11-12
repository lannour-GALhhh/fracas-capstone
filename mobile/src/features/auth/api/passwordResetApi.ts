/** Anonymous SMS forgot-password endpoints. Raw axios: pre-auth, no token/refresh logic needed. */
import axios from 'axios'

import { API_BASE_URL } from '@/core/config'

const CONFIG = { headers: { 'X-Client': 'mobile' } }
const BASE = `${API_BASE_URL}/api/auth/password-reset`

/** Step 1 — queue an SMS code. The server answers the same for unknown numbers. */
export async function requestResetCode(phone_number: string): Promise<void> {
    await axios.post(`${BASE}/phone/`, { phone_number }, CONFIG)
}

export interface ResetGrant {
    uid: string
    token: string
}

/** Step 2 — trade a correct code for a single-use grant. */
export async function verifyResetCode(phone_number: string, code: string): Promise<ResetGrant> {
    const { data } = await axios.post<ResetGrant>(`${BASE}/phone/verify/`, { phone_number, code }, CONFIG)
    return data
}

/** Step 3 — set the new password with the grant. */
export async function confirmReset(grant: ResetGrant, new_password: string): Promise<void> {
    await axios.post(`${BASE}/confirm/`, { ...grant, new_password }, CONFIG)
}
