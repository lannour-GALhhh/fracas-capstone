type token = string | null;

const ACCESS_KEY = 'fracas.access';
const REFRESH_KEY = 'fracas.refresh';

const read = (key: string): token => {
    try { return localStorage.getItem(key) } catch { return null }
}

const write = (key: string, value: token): void => {
    try {
        if (value) localStorage.setItem(key, value)
        else localStorage.removeItem(key)
    } catch { /* storage unavailable (private mode / blocked) */ }
}

const tokenService = {
    getAccess: (): token => read(ACCESS_KEY),
    setAccess: (t: token): void => write(ACCESS_KEY, t),
    getRefresh: (): token => read(REFRESH_KEY),
    setRefresh: (t: token): void => write(REFRESH_KEY, t),
    clear: (): void => { write(ACCESS_KEY, null); write(REFRESH_KEY, null) },
    /** @deprecated use clear() */
    clearAccess: (): void => { write(ACCESS_KEY, null); write(REFRESH_KEY, null) },
}

export default tokenService
