/**
 * Tiny typed pub/sub for the "session expired" signal (RN has no `window` to
 * dispatch events on). `apiClient` emits when a refresh fails; `AuthProvider`
 * subscribes and clears auth, which trips the Expo Router layout guard back to login.
 */
type Handler = () => void

const handlers = new Set<Handler>()

export const sessionEvents = {
    /** Subscribe; returns an unsubscribe function. */
    onExpired(handler: Handler): () => void {
        handlers.add(handler)
        return () => handlers.delete(handler)
    },
    emitExpired(): void {
        handlers.forEach((handler) => handler())
    },
}
