import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { BackHandler } from 'react-native'

/**
 * Intercept the Android hardware back press while the screen is focused.
 *
 * For screens that hold their own in-screen history (a wizard's steps, an open
 * sheet): return `true` to consume the press and unwind one layer, `false` to
 * let the navigator pop the route as usual. Pass a `useCallback`-stable handler
 * — the subscription re-registers whenever its identity changes.
 */
export function useBackHandler(handler: () => boolean): void {
    useFocusEffect(
        useCallback(() => {
            const subscription = BackHandler.addEventListener('hardwareBackPress', handler)
            return () => subscription.remove()
        }, [handler]),
    )
}
