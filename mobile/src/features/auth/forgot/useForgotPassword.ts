import { useCallback, useEffect, useState } from 'react'

import { apiErrorMessage } from '@/common/utils/apiError'
import { normalizePhone } from '@/common/utils/phone'

import {
    confirmReset,
    requestResetCode,
    verifyResetCode,
    type ResetGrant,
} from '../api/passwordResetApi'

export type ForgotStep = 'phone' | 'code' | 'password' | 'done'

/** Matches the backend's resend cooldown, so "Resend" is only offered when it can succeed. */
export const RESEND_SECONDS = 60

/** Drives phone → code → new password → done. */
export function useForgotPassword() {
    const [step, setStep] = useState<ForgotStep>('phone')
    const [phone, setPhone] = useState('')
    const [grant, setGrant] = useState<ResetGrant | null>(null)
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cooldown, setCooldown] = useState(0)

    useEffect(() => {
        if (cooldown <= 0) return
        const id = setTimeout(() => setCooldown((s) => s - 1), 1000)
        return () => clearTimeout(id)
    }, [cooldown])

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

    const sendCode = useCallback(
        (rawPhone: string) =>
            run(async () => {
                const normalized = normalizePhone(rawPhone)!
                await requestResetCode(normalized)
                setPhone(normalized)
                setCooldown(RESEND_SECONDS)
                setStep('code')
            }),
        [run],
    )

    const resend = useCallback(
        () =>
            run(async () => {
                await requestResetCode(phone)
                setCooldown(RESEND_SECONDS)
            }),
        [run, phone],
    )

    const verify = useCallback(
        (code: string) =>
            run(async () => {
                setGrant(await verifyResetCode(phone, code))
                setStep('password')
            }),
        [run, phone],
    )

    const setPassword = useCallback(
        (password: string) =>
            run(async () => {
                await confirmReset(grant!, password)
                setGrant(null)
                setStep('done')
            }),
        [run, grant],
    )

    /** Unwind one step; false at the first step (and once done) so back leaves the flow. */
    const back = useCallback(() => {
        if (step !== 'code') return false
        setError(null)
        setStep('phone')
        return true
    }, [step])

    return { step, phone, pending, error, cooldown, sendCode, resend, verify, setPassword, back }
}
