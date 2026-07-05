/**
 * Anonymous phone-first registration endpoints (3 phases). Raw axios — these are
 * AllowAny and pre-auth, so the shared apiClient's token/refresh logic is moot.
 */
import axios from 'axios'

import { API_BASE_URL } from '@/core/config'
import type { TokenPair } from '@/features/auth/types/authTypes'
import type { PublicBarangayCollection } from '@/features/gis/types'

import type { RegistrationAddress } from '../types'

const CONFIG = { headers: { 'X-Client': 'mobile' } }

/** Public barangay boundaries (geometry + name) for pre-auth point-in-polygon. */
export async function getPublicBarangays(): Promise<PublicBarangayCollection> {
    const { data } = await axios.get<PublicBarangayCollection>(
        `${API_BASE_URL}/api/barangays/public/`,
        CONFIG,
    )
    return data
}

/** Phase 1 — create the pending account and send an OTP. */
export async function registerStart(
    phone_number: string,
    address: RegistrationAddress,
): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/auth/register/start/`, { phone_number, address }, CONFIG)
}

/** Re-send the OTP for a pending registration. */
export async function registerResend(phone_number: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/auth/register/resend/`, { phone_number }, CONFIG)
}

/** Phase 2 — verify the OTP (records terms acceptance server-side). */
export async function registerVerify(phone_number: string, code: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/auth/register/verify/`, { phone_number, code }, CONFIG)
}

/** Phase 3 — set the password, activate, and receive tokens (lands logged in). */
export async function registerSetPassword(
    phone_number: string,
    password: string,
): Promise<TokenPair> {
    const { data } = await axios.post<TokenPair>(
        `${API_BASE_URL}/api/auth/register/set-password/`,
        { phone_number, password },
        CONFIG,
    )
    return data
}
