import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'

import { registerDevice, unregisterDevice } from '../api/alertsApi'

const DEVICE_ID_KEY = 'fracas:push-device-id'

/** Expo Go can't deliver remote push (SDK 53+); a dev/prod build is required. */
const isExpoGo = Constants.appOwnership === 'expo'

// Foreground presentation: show incoming alerts as a banner even with the app open.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
})

/**
 * Android channel settings are immutable once created, so the emergency profile lives under a new id
 * (the old `alerts` channel is deleted). Must match `EMERGENCY_CHANNEL_ID` in backend/users/senders/push.py.
 */
const EMERGENCY_CHANNEL_ID = 'alerts_emergency'

const ensureAndroidChannel = async () => {
    if (Platform.OS !== 'android') return
    await Notifications.deleteNotificationChannelAsync('alerts').catch(() => undefined)
    await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
        name: 'Emergency flood alerts',
        description: 'Loud, persistent alerts when flooding is critical in your barangay.',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'emergency_alarm.mp3', // bundled via the expo-notifications plugin `sounds` (app.json)
        audioAttributes: {
            usage: Notifications.AndroidAudioUsage.ALARM, // plays at alarm volume
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
        // Long, repeated pulses instead of a single buzz.
        vibrationPattern: [0, 800, 400, 800, 400, 800, 400, 800],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#FF0000',
        bypassDnd: true, // only effective if the user grants "Do Not Disturb access"
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
}

/** Acquire the native (FCM/APNs) device token and upsert it server-side. */
const registerForPush = async (): Promise<void> => {
    if (!Device.isDevice || isExpoGo) return
    await ensureAndroidChannel()

    const existing = await Notifications.getPermissionsAsync()
    let granted = existing.granted
    if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted
    if (!granted) return

    const { data } = await Notifications.getDevicePushTokenAsync()
    const token = typeof data === 'string' ? data : String(data)
    const platform = Platform.OS === 'ios' ? 'ios' : 'android'
    const device = await registerDevice(token, platform)
    await AsyncStorage.setItem(DEVICE_ID_KEY, String(device.id))
}

/** Best-effort: drop this device's push token (called on sign-out). */
export const unregisterPushDevice = async (): Promise<void> => {
    const id = await AsyncStorage.getItem(DEVICE_ID_KEY)
    if (!id) return
    try {
        await unregisterDevice(Number(id))
    } catch {
        // A stale/absent device is fine — the goal is "no longer receiving here".
    }
    await AsyncStorage.removeItem(DEVICE_ID_KEY)
}

/**
 * Register this device for push while `enabled`. Runs only on a physical device outside Expo Go; delivery
 * additionally requires FCM credentials server-side (`PUSH_PROVIDER=fcm`).
 */
export const usePushRegistration = (enabled: boolean): void => {
    useEffect(() => {
        if (!enabled) return
        void registerForPush()
    }, [enabled])
}

/**
 * Silence the alarm once the user engages: Android stops a notification's sound when that notification is
 * cancelled, so clearing the tray on app open (or on tapping the notification) ends the alert.
 */
export const useDismissAlertsOnOpen = (): void => {
    useEffect(() => {
        if (isExpoGo) return
        const clear = () => void Notifications.dismissAllNotificationsAsync().catch(() => undefined)

        clear() // cold start
        const appState = AppState.addEventListener('change', (state) => {
            if (state === 'active') clear()
        })
        const tapped = Notifications.addNotificationResponseReceivedListener(clear)
        return () => {
            appState.remove()
            tapped.remove()
        }
    }, [])
}
