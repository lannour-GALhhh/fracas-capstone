import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
    getHotspots,
    getModelPerformance,
    getRainfallTimeline,
    getSummary,
} from '../api/analyticsApi'
import { REFRESH_MS } from '../constants/analytics'
import type { AnalyticsWindow } from '../types/api'
import { analyticsKeys } from './queryKeys'

// All five panels share the same freshness policy: keep the previous window's
// data on screen while the next loads, and poll on the alerts-page cadence.
const shared = {
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
} as const

export const useSummary = (days: AnalyticsWindow) =>
    useQuery({ queryKey: analyticsKeys.summary(days), queryFn: () => getSummary(days), ...shared })

export const useHotspots = (days: AnalyticsWindow) =>
    useQuery({ queryKey: analyticsKeys.hotspots(days), queryFn: () => getHotspots(days), ...shared })

export const useRainfallTimeline = (days: AnalyticsWindow) =>
    useQuery({
        queryKey: analyticsKeys.rainfall(days),
        queryFn: () => getRainfallTimeline(days),
        ...shared,
    })

export const useModelPerformance = () =>
    useQuery({ queryKey: analyticsKeys.model(), queryFn: getModelPerformance, ...shared })
