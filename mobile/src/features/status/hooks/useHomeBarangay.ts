import { useCurrentUser } from '@/features/account/hooks/useCurrentUser'
import { barangayByName } from '@/features/gis/utils/geo'
import type { RiskFeature, RiskFeatureCollection } from '@/features/gis/types'

export interface HomeBarangay {
    /** The resident's home barangay feature, or null when unset/unmatched. */
    feature: RiskFeature | null
    /** The saved home barangay name (even if it didn't match a boundary). */
    name: string | null
    /** True once a home address barangay is on file. */
    hasAddress: boolean
    isLoading: boolean
}

/**
 * Resolve the resident's home barangay by matching their saved address barangay
 * name against the downloaded boundaries. Registration stores the operational
 * barangay name (resolved by point-in-polygon), so the match is reliable.
 */
export const useHomeBarangay = (features: RiskFeatureCollection | null): HomeBarangay => {
    const { data: user, isLoading } = useCurrentUser()
    const name = user?.address?.barangay?.trim() || null

    return {
        feature: barangayByName(features, name),
        name,
        hasAddress: Boolean(name),
        isLoading,
    }
}
