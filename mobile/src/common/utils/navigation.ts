import { type Href, router } from 'expo-router'

/** Where a back press lands when there is nothing left to pop. */
const HOME: Href = '/status'

/**
 * Pop exactly one screen.
 *
 * `router.back()` on its own is a no-op when the app was opened straight onto a
 * secondary screen (push-notification tap, deep link) — the back affordance
 * silently does nothing. Falling back to a single `replace` keeps the gesture to
 * one step in every case instead of unwinding the whole history.
 */
export function goBack(fallback: Href = HOME): void {
    if (router.canGoBack()) router.back()
    else router.replace(fallback)
}
