import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import type { Coords } from '@/common/hooks/useCurrentLocation'

import { reportRadiusStatus } from './api'
import { hasLeft, isInside } from './geometry'
import type { RadiusEvacuation } from './types'
import { radiusKeys } from './useRadiusEvacuations'

/**
 * Establish the resident's status for each active radius evacuation from where
 * they are:
 *   - inside the radius                          -> report `inside`
 *   - outside it (past the exit buffer) after
 *     having been inside                         -> report `safe` (evacuated)
 * Residents who were never inside report nothing (the evacuation isn't theirs).
 * Reports transitions only, once each; `safe` is terminal server-side.
 */
export const useRadiusTracker = (evacuations: RadiusEvacuation[], coords: Coords | null) => {
    const queryClient = useQueryClient()
    // Last status this device reported per evacuation (survives re-renders).
    const reported = useRef(new Map<number, 'inside' | 'safe'>())

    const { mutate } = useMutation({
        mutationFn: reportRadiusStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: radiusKeys.all }),
        onError: (_e, vars) => {
            // Let the next location tick retry this transition.
            reported.current.delete(vars.evacuation_id)
        },
    })

    useEffect(() => {
        if (!coords) return
        for (const evac of evacuations) {
            if (evac.my_status === 'safe') continue
            const last = reported.current.get(evac.id) ?? evac.my_status
            if (last !== 'inside' && isInside(coords, evac)) {
                reported.current.set(evac.id, 'inside')
                mutate({ evacuation_id: evac.id, status: 'inside', lat: coords.lat, lng: coords.lng })
            } else if (last === 'inside' && hasLeft(coords, evac)) {
                reported.current.set(evac.id, 'safe')
                mutate({ evacuation_id: evac.id, status: 'safe', lat: coords.lat, lng: coords.lng })
            }
        }
    }, [coords, evacuations, mutate])
}
