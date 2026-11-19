import * as Notifications from 'expo-notifications'
import { useCallback, useEffect, useState } from 'react'
import { AppState, Linking } from 'react-native'

import { usePreferences, useUpdatePreferences } from './usePreferences'

/**
 * Whether the resident will actually receive alerts on this device, and a way to fix it.
 * "Off" means either the push preference is disabled in the app, or the OS notification
 * permission is not granted. Re-checks when the app returns to the foreground, so coming
 * back from system Settings clears the card.
 */
export function useAlertsOff() {
    const prefs = usePreferences()
    const update = useUpdatePreferences()
    const [osGranted, setOsGranted] = useState<boolean | null>(null)
    const [enabling, setEnabling] = useState(false)

    const refreshPermission = useCallback(async () => {
        try {
            setOsGranted((await Notifications.getPermissionsAsync()).granted)
        } catch {
            setOsGranted(true) // can't tell: don't nag
        }
    }, [])

    useEffect(() => {
        void refreshPermission()
        const sub = AppState.addEventListener('change', (s) => {
            if (s === 'active') void refreshPermission()
        })
        return () => sub.remove()
    }, [refreshPermission])

    const pushEnabled = prefs.data?.push_enabled
    const off = prefs.data !== undefined && osGranted !== null && (!pushEnabled || !osGranted)

    const enable = useCallback(async () => {
        setEnabling(true)
        try {
            let granted = osGranted === true
            if (!granted) {
                const current = await Notifications.getPermissionsAsync()
                granted = current.granted
                if (!granted && current.canAskAgain) {
                    granted = (await Notifications.requestPermissionsAsync()).granted
                }
                setOsGranted(granted)
                // Blocked at the OS level: only system Settings can turn it back on.
                if (!granted) void Linking.openSettings()
            }
            if (!pushEnabled) await update.mutateAsync({ push_enabled: true })
        } catch {
            // leave the card visible so the resident can retry
        } finally {
            setEnabling(false)
        }
    }, [osGranted, pushEnabled, update])

    return { off, enable, enabling }
}
