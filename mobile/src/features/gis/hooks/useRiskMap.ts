import { useMemo } from 'react'

import { CATEGORY_ORDER } from '../constants/risk'
import type { RiskCategory, RiskFeatureCollection, RiskSnapshotEntry } from '../types'
import { useBarangays } from './useBarangays'
import { useRiskSnapshot } from './useRiskSnapshot'

export interface CategoryGroup {
    category: RiskCategory
    barangays: { id: number; name: string }[]
}

export interface RiskMap {
    /** Geometry with risk category/score merged into each feature's properties. */
    features: RiskFeatureCollection | null
    /** Barangays grouped by category, ordered most-severe first. */
    groups: CategoryGroup[]
    computedAt: string | null
    degradedCount: number
    isLoading: boolean
    isError: boolean
    refetch: () => void
}

const emptyGroups = (): Record<RiskCategory, CategoryGroup> =>
    CATEGORY_ORDER.reduce((acc, category) => {
        acc[category] = { category, barangays: [] }
        return acc
    }, {} as Record<RiskCategory, CategoryGroup>)

/**
 * The core data layer: joins `/barangays/` geometry with the `/risk/snapshot/`
 * by barangay id (the snapshot is NOT GeoJSON) and derives the category summary
 * in a single memoized pass. Ported from the web `useRiskMap`.
 */
export const useRiskMap = (): RiskMap => {
    const barangays = useBarangays()
    const snapshot = useRiskSnapshot()
    const geo = barangays.data
    const snap = snapshot.data

    // Keyed on the stable query `.data` so the joined collection is only rebuilt
    // when geometry or the snapshot actually changes (not on every render).
    const derived = useMemo(() => {
        const byId = new Map<number, RiskSnapshotEntry>()
        snap?.barangays.forEach((entry) => byId.set(entry.id, entry))

        const grouped = emptyGroups()
        let degradedCount = 0

        const features: RiskFeatureCollection | null = geo
            ? {
                  type: 'FeatureCollection',
                  features: geo.features.map((feature) => {
                      const entry = byId.get(feature.properties.id)
                      if (entry) {
                          grouped[entry.category].barangays.push({
                              id: entry.id,
                              name: entry.name,
                          })
                          if (entry.is_degraded) degradedCount += 1
                      }
                      return {
                          ...feature,
                          id: feature.properties.id, // enables map feature-state
                          properties: {
                              ...feature.properties,
                              category: entry?.category ?? null,
                              score: entry?.score ?? null,
                              is_degraded: entry?.is_degraded ?? false,
                          },
                      }
                  }),
              }
            : null

        return {
            features,
            groups: CATEGORY_ORDER.map((c) => grouped[c]),
            computedAt: snap?.computed_at ?? null,
            degradedCount,
        }
    }, [geo, snap])

    return {
        ...derived,
        isLoading: barangays.isLoading || snapshot.isLoading,
        isError: barangays.isError || snapshot.isError,
        refetch: () => {
            barangays.refetch()
            snapshot.refetch()
        },
    }
}
