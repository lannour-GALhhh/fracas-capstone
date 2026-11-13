import { useSyncExternalStore } from 'react'

const KEY = 'fracas.rainfallSimulation'
const listeners = new Set<() => void>()

const read = (): boolean => {
    try {
        return localStorage.getItem(KEY) === '1'
    } catch {
        return false
    }
}

// Mirrors localStorage so the settings switch, the dashboard card's Off button and other tabs agree.
let enabled = read()

const emit = () => listeners.forEach((l) => l())

export const setSimulationEnabled = (next: boolean) => {
    enabled = next
    try {
        localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
        /* private mode: still works for this visit */
    }
    emit()
}

const subscribe = (listener: () => void) => {
    listeners.add(listener)
    const onStorage = (e: StorageEvent) => {
        if (e.key !== KEY) return
        enabled = read()
        listener()
    }
    window.addEventListener('storage', onStorage)
    return () => {
        listeners.delete(listener)
        window.removeEventListener('storage', onStorage)
    }
}

/** Per-admin, per-browser: the simulation is a sandbox and never touches saved settings. */
export const useSimulationEnabled = () => useSyncExternalStore(subscribe, () => enabled)
