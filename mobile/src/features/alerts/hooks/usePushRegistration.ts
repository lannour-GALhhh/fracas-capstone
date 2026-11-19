import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { useEffect } from 'react'
import { Platform } from 'react-native'

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

const ensureAndroidChannel = async () => {
    if (Platform.OS !== 'android') return
    await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Flood alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
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
