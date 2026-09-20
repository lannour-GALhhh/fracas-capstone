import { useQuery } from '@tanstack/react-query'
import { getZoneRiskSnapshot } from '../api/gisApi'
import { gisKeys } from './queryKeys'
import type { RiskCategory, ZoneRiskSnapshot } from '../types/api'

const REFRESH_MS = 5 * 60_000 // match the barangay risk snapshot cadence

export type ZoneRiskLookup = Map<string, { score: number; category: RiskCategory }>

/** Module-level so React Query memoizes it; an inline select thrashes downstream effects. */
const toZoneLookup = (snapshot: ZoneRiskSnapshot): ZoneRiskLookup => {
    const byKey: ZoneRiskLookup = new Map()
    for (const z of snapshot.zones) {
        byKey.set(`${z.barangay_id}-${z.level}`, { score: z.score, category: z.category })
    }
    return byKey
}

/** Live per-zone computed risk, keyed for O(1) lookup by `barangay-level`. */
export const useZoneRisk = () =>
    useQuery({
        queryKey: gisKeys.zoneRisk,
        queryFn: getZoneRiskSnapshot,
        refetchInterval: REFRESH_MS,
        select: toZoneLookup,
    })
