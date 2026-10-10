import type { ZoneRiskLookup } from '@/features/gis/hooks/useZoneRisk'
import { SUSCEPTIBILITY_ORDER } from '@/features/gis/constants/susceptibility'
import type { RiskCategory, SusceptibilityLevel } from '@/features/gis/types/api'

export interface ZoneRow {
    level: SusceptibilityLevel
    score: number
    category: RiskCategory
    /** High/Critical zones are evacuated by default. */
    qualifies: boolean
}

const QUALIFYING: RiskCategory[] = ['high', 'critical']

/** A barangay's scored zones, most susceptible first. */
export const zoneRows = (barangayId: number, lookup: ZoneRiskLookup | undefined): ZoneRow[] =>
    [...SUSCEPTIBILITY_ORDER].reverse().flatMap((level) => {
        const z = lookup?.get(`${barangayId}-${level}`)
        return z
            ? [{ level, score: z.score, category: z.category, qualifies: QUALIFYING.includes(z.category) }]
            : []
    })
