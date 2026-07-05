import * as Location from 'expo-location'
import { useCallback, useState } from 'react'

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export interface Coords {
    lng: number
    lat: number
}

export interface CurrentLocation {
    status: LocationStatus
    coords: Coords | null
    /** Request foreground permission and read the current position once. */
    request: () => Promise<Coords | null>
    reset: () => void
}

/**
 * Thin `expo-location` wrapper shared by the status screen and registration
 * address capture. Foreground-only; works in Expo Go. Reading is on-demand
 * (`request()`), not continuous — we only need a one-shot fix.
 */
export function useCurrentLocation(): CurrentLocation {
    const [status, setStatus] = useState<LocationStatus>('idle')
    const [coords, setCoords] = useState<Coords | null>(null)

    const request = useCallback(async (): Promise<Coords | null> => {
        setStatus('requesting')
        try {
            const { status: permission } = await Location.requestForegroundPermissionsAsync()
            if (permission !== 'granted') {
                setStatus('denied')
                return null
            }
            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            })
            const next = { lng: position.coords.longitude, lat: position.coords.latitude }
            setCoords(next)
            setStatus('granted')
            return next
        } catch {
            setStatus('error')
            return null
        }
    }, [])

    const reset = useCallback(() => {
        setStatus('idle')
        setCoords(null)
    }, [])

    return { status, coords, request, reset }
}
