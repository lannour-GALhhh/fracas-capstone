import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { API_BASE_URL, API_FALLBACK_URL } from '@/core/config'

const PROBE_TIMEOUT_MS = 5000
const ONLINE_RECHECK_MS = 60_000
const OFFLINE_RECHECK_MS = 8_000

async function reachable(base: string): Promise<boolean> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    try {
        // Any HTTP answer (even an error status) proves the network path works.
        await fetch(`${base}/api/health/`, { signal: controller.signal, headers: { 'X-Client': 'mobile' } })
        return true
    } catch {
        return false
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Whether the FRACAS backend is reachable. Probing our own server (instead of a
 * generic "has network" flag) is what actually matters here, needs no native
 * module, and so ships over EAS Update. Re-checks on foreground, on an interval,
 * and faster while offline so the app recovers quickly.
 *
 * Starts optimistic (`true`) so a cold start doesn't flash the offline screen.
 */
export function useOnlineStatus() {
    const [online, setOnline] = useState(true)
    const [checking, setChecking] = useState(false)
    const onlineRef = useRef(true)

    const check = useCallback(async () => {
        setChecking(true)
        let ok = await reachable(API_BASE_URL)
        if (!ok && API_FALLBACK_URL && API_FALLBACK_URL !== API_BASE_URL) {
            ok = await reachable(API_FALLBACK_URL)
        }
        onlineRef.current = ok
        setOnline(ok)
        setChecking(false)
        return ok
    }, [])

    useEffect(() => {
        // Deferred so the first probe's state updates don't run synchronously in the effect.
        const first = setTimeout(() => void check(), 0)
        let timer: ReturnType<typeof setTimeout>
        const schedule = () => {
            timer = setTimeout(async () => {
                await check()
                schedule()
            }, onlineRef.current ? ONLINE_RECHECK_MS : OFFLINE_RECHECK_MS)
        }
        schedule()
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') void check()
        })
        return () => {
            clearTimeout(first)
            clearTimeout(timer)
            sub.remove()
        }
    }, [check])

    return { online, checking, retry: check }
}
