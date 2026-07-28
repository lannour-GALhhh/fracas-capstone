import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

import type { Coords } from '@/common/hooks/useCurrentLocation'
import type { RiskFeatureCollection } from '@/features/gis/types'
import { featureAt, type NearestCenter } from '@/features/gis/utils/geo'

import { reportEvacuationStatus } from '../api/evacuationApi'
import { SAFE_RADIUS_M } from '../constants'
import type { EvacuationReport, MyEvacuation } from '../types'
import { evacuationKeys } from './queryKeys'

/**
 * Derive what to report from where the resident is right now:
 *   - within SAFE_RADIUS_M of a center -> safe (reached center)
 *   - outside their evacuation barangay -> safe (left the danger zone)
 *   - otherwise                         -> moving (acknowledged, en route)
 *
 * NOTE: "left the danger zone" uses the barangay boundary as a proxy for the
 * hazard (FSA) polygon. Tightening it to the dissolved susceptibility geometry
 * is a planned enhancement (see the exit-fence decision in
 * docs/AUTO_EVACUATION.md) — the barangay boundary is the coarse first cut.
 */
const computeReport = (
    evac: MyEvacuation,
    coords: Coords,
    nearest: NearestCenter | null,
    features: RiskFeatureCollection | null,
): EvacuationReport => {
    const base = { evacuation_id: evac.evacuation_id, lat: coords.lat, lng: coords.lng }

    if (nearest && nearest.distanceKm * 1000 <= SAFE_RADIUS_M) {
        return { ...base, status: 'safe', resolved_via: 'center', center_id: nearest.center.properties.id }
    }
    const here = featureAt(coords, features)
    if (here && here.properties.id !== evac.barangay_id) {
        return { ...base, status: 'safe', resolved_via: 'left_zone' }
    }
    return { ...base, status: 'moving' }
}

/**
 * Report this device's evacuation status as the resident moves, plus a manual
 * `markSafe()` for the banner button. Auto-reports at most once per distinct
 * derived status, so we never spam the endpoint. Does nothing once the resident
 * is already `safe` (a terminal state for this evacuation).
 */
export const useEvacuationReporter = (
    evacuation: MyEvacuation | null,
    coords: Coords | null,
    nearest: NearestCenter | null,
    features: RiskFeatureCollection | null,
) => {
    const queryClient = useQueryClient()
    const lastSig = useRef<string | null>(null)

    const mutation = useMutation({
        mutationFn: reportEvacuationStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: evacuationKeys.mine }),
    })
    const { mutate } = mutation

    useEffect(() => {
        if (!evacuation || !coords || evacuation.my_status === 'safe') return
        const payload = computeReport(evacuation, coords, nearest, features)
        const sig = `${payload.evacuation_id}:${payload.status}:${payload.resolved_via ?? ''}`
        if (sig === lastSig.current) return
        lastSig.current = sig
        mutate(payload)
    }, [evacuation, coords, nearest, features, mutate])

    const markSafe = useCallback(() => {
        if (!evacuation) return
        const base = coords
            ? computeReport(evacuation, coords, nearest, features)
            : { evacuation_id: evacuation.evacuation_id }
        const payload: EvacuationReport = { ...base, status: 'safe' }
        lastSig.current = `${payload.evacuation_id}:safe:${payload.resolved_via ?? ''}`
        mutate(payload)
    }, [evacuation, coords, nearest, features, mutate])

    return { markSafe, isReporting: mutation.isPending }
}
