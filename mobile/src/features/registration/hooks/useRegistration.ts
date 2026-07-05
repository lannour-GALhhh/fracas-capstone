import { useCallback, useState } from 'react'

import { apiErrorMessage } from '@/common/utils/apiError'
import { normalizePhone } from '@/common/utils/phone'
import { useAuth } from '@/features/auth/context/useAuth'

import {
    registerResend,
    registerSetPassword,
    registerStart,
    registerVerify,
} from '../api/registrationApi'
import type { RegistrationAddress, RegistrationStep } from '../types'

/**
 * Drives the 3-phase registration state machine. Holds the shared data (the
 * normalized phone + address) across steps so the step components stay
 * presentational, and advances `step` as each phase succeeds. The final phase
 * adopts the returned tokens via `AuthProvider`, which flips the app to
 * authenticated (the layout guard then redirects into the app).
 */
export function useRegistration() {
    const { applyTokens } = useAuth()
    const [step, setStep] = useState<RegistrationStep>('phone')
    const [phone, setPhone] = useState('') // normalized +63…
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const run = useCallback(async (action: () => Promise<void>) => {
        setPending(true)
        setError(null)
        try {
            await action()
        } catch (err) {
            setError(apiErrorMessage(err))
        } finally {
            setPending(false)
        }
    }, [])

    const start = useCallback(
        (rawPhone: string, address: RegistrationAddress) =>
            run(async () => {
                const normalized = normalizePhone(rawPhone)!
                await registerStart(normalized, address)
                setPhone(normalized)
                setStep('verify')
            }),
        [run],
    )

    const resend = useCallback(() => run(() => registerResend(phone)), [run, phone])

    const verify = useCallback(
        (code: string) =>
            run(async () => {
                await registerVerify(phone, code)
                setStep('password')
            }),
        [run, phone],
    )

    const setPassword = useCallback(
        (password: string) =>
            run(async () => {
                const tokens = await registerSetPassword(phone, password)
                await applyTokens(tokens)
            }),
        [run, phone, applyTokens],
    )

    return { step, phone, pending, error, start, resend, verify, setPassword }
}
