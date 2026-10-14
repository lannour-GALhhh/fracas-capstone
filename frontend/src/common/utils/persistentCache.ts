/**
 * Tiny IndexedDB-backed cache for large, rarely-changing payloads (e.g. GeoJSON), which are
 * too big for localStorage. Every failure degrades to a cache miss so callers just refetch.
 */
const DB_NAME = 'fracas-cache'
const STORE = 'entries'

interface Entry<T> {
    value: T
    storedAt: number
}

const openDb = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'))
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => req.result.createObjectStore(STORE)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })

const run = async <R>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<R>): Promise<R> => {
    const db = await openDb()
    try {
        return await new Promise<R>((resolve, reject) => {
            const req = fn(db.transaction(STORE, mode).objectStore(STORE))
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
        })
    } finally {
        db.close()
    }
}

/** Cached value, or undefined when missing, older than `maxAgeMs`, or storage fails. */
export const readCache = async <T>(key: string, maxAgeMs: number): Promise<T | undefined> => {
    try {
        const entry = await run<Entry<T> | undefined>('readonly', (s) => s.get(key))
        if (entry && Date.now() - entry.storedAt <= maxAgeMs) return entry.value
    } catch {
        /* treat as a miss */
    }
    return undefined
}

export const writeCache = async <T>(key: string, value: T): Promise<void> => {
    try {
        await run('readwrite', (s) => s.put({ value, storedAt: Date.now() } satisfies Entry<T>, key))
    } catch {
        /* quota / private mode: caching is best-effort */
    }
}

export const clearCache = async (key: string): Promise<void> => {
    try {
        await run('readwrite', (s) => s.delete(key))
    } catch {
        /* nothing to clear */
    }
}

/**
 * Wrap a fetcher: serve from IndexedDB while fresh, otherwise fetch and store.
 * Bump `key`'s version suffix when the payload shape changes.
 */
export const cachedFetch = async <T>(key: string, maxAgeMs: number, fetcher: () => Promise<T>): Promise<T> => {
    const hit = await readCache<T>(key, maxAgeMs)
    if (hit !== undefined) return hit
    const fresh = await fetcher()
    void writeCache(key, fresh)
    return fresh
}
