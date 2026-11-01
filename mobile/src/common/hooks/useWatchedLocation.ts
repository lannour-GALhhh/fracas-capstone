import * as Location from 'expo-location'
import { useEffect, useState } from 'react'

import type { Coords } from './useCurrentLocation'

/**
 * Continuous foreground position while `enabled` (e.g. only during an active
 * evacuation, to keep battery use bounded). Assumes permission was already
 * granted by `useCurrentLocation`; yields null until the first fix.
 */
export function useWatchedLocation(enabled: boolean): Coords | null {
    const [coords, setCoords] = useState<Coords | null>(null)

    useEffect(() => {
        if (!enabled) return
        let sub: Location.LocationSubscription | null = null
        let cancelled = false
        void Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 10_000 },
            (p) => setCoords({ lng: p.coords.longitude, lat: p.coords.latitude }),
        )
            .then((s) => {
                if (cancelled) s.remove()
                else sub = s
            })
            .catch(() => undefined)
        return () => {
            cancelled = true
            sub?.remove()
        }
    }, [enabled])

    return coords
}
