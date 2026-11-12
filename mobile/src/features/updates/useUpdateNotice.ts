import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Updates from 'expo-updates'
import { useCallback, useEffect, useState } from 'react'

const SEEN_KEY = 'fracas:last-seen-update-id'

/**
 * EAS Update support, in two halves:
 *
 * 1. On launch, quietly check for an OTA update; if one exists, download it and
 *    reload straight into it (otherwise it would only apply on the *next* cold start).
 * 2. When the app is running an OTA update it hasn't announced yet (its id differs from
 *    the stored one), `visible` turns true so the "updated" modal can be shown once.
 *
 * No-op in dev / Expo Go, where `Updates.isEnabled` is false.
 */
export function useUpdateNotice() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!Updates.isEnabled) return
        let cancelled = false

        void (async () => {
            try {
                const id = Updates.updateId
                if (id && !Updates.isEmbeddedLaunch && (await AsyncStorage.getItem(SEEN_KEY)) !== id) {
                    if (!cancelled) setVisible(true)
                    return // just reloaded into the new update; don't re-check this session
                }
                const check = await Updates.checkForUpdateAsync()
                if (check.isAvailable) {
                    await Updates.fetchUpdateAsync()
                    await Updates.reloadAsync()
                }
            } catch {
                // offline or server unreachable — try again next launch
            }
        })()

        return () => {
            cancelled = true
        }
    }, [])

    const dismiss = useCallback(() => {
        setVisible(false)
        const id = Updates.updateId
        if (id) void AsyncStorage.setItem(SEEN_KEY, id).catch(() => undefined)
    }, [])

    return { visible, dismiss }
}
