import AsyncStorage from '@react-native-async-storage/async-storage'

const DONE_KEY = 'fracas:onboarding-done'

/** Whether this device has finished (or skipped) the first-run tour. */
export async function hasSeenOnboarding(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(DONE_KEY)) === '1'
    } catch {
        return true // storage unavailable: never trap the user in the tour
    }
}

export async function markOnboardingSeen(): Promise<void> {
    try {
        await AsyncStorage.setItem(DONE_KEY, '1')
    } catch {
        // non-fatal; the tour may show once more next launch
    }
}
