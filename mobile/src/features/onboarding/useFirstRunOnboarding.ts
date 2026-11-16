import { router } from 'expo-router'
import { useEffect } from 'react'

import { hasSeenOnboarding } from './storage'

/** On the first signed-in launch of a device, send the resident to the tour. */
export function useFirstRunOnboarding(): void {
    useEffect(() => {
        let cancelled = false
        void hasSeenOnboarding().then((seen) => {
            if (!cancelled && !seen) router.replace('/onboarding')
        })
        return () => {
            cancelled = true
        }
    }, [])
}
