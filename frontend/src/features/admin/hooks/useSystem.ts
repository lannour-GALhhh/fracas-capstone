import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    getActiveRiskConfig,
    getAutoDetectConfig,
    getSystemStatus,
    runPipeline,
    runRetention,
    updateAutoDetectConfig,
    updateZoneAggregation,
} from '../api/systemApi'
import type { AutoDetectConfig, ZoneAggregation } from '../types/system'
import { adminKeys } from './queryKeys'

/** Live ops picture — refreshed on a slow interval so staleness stays visible. */
export const useSystemStatus = () =>
    useQuery({
        queryKey: adminKeys.systemStatus(),
        queryFn: getSystemStatus,
        refetchInterval: 30_000,
    })

export const useAutoDetectConfig = () =>
    useQuery({
        queryKey: adminKeys.autoDetect(),
        queryFn: getAutoDetectConfig,
    })

/** Kick the pipeline off-cycle, then nudge the status query. */
export const useRunPipeline = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: runPipeline,
        onSuccess: (data) => {
            toast.success(data.detail ?? 'Pipeline run queued')
            queryClient.invalidateQueries({ queryKey: adminKeys.systemStatus() })
        },
        onError: () => toast.error("Couldn't queue the pipeline run", { description: 'Please try again.' }),
    })
}

export const useRunRetention = () => {
    return useMutation({
        mutationFn: runRetention,
        onSuccess: (data) => toast.success(data.detail ?? 'Retention cleanup queued'),
        onError: () => toast.error("Couldn't queue the cleanup", { description: 'Please try again.' }),
    })
}

export const useUpdateAutoDetect = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: Partial<AutoDetectConfig>) => updateAutoDetectConfig(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.autoDetect() })
            toast.success('Auto-detect settings saved')
        },
        onError: () => toast.error("Couldn't save auto-detect settings", { description: 'Please try again.' }),
    })
}

export const useActiveRiskConfig = () =>
    useQuery({
        queryKey: adminKeys.riskConfig(),
        queryFn: getActiveRiskConfig,
    })

export const useUpdateZoneAggregation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, value }: { id: number; value: ZoneAggregation }) => updateZoneAggregation(id, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.riskConfig() })
            toast.success('Zone aggregation saved', { description: 'Applies from the next pipeline run.' })
        },
        onError: () => toast.error("Couldn't save zone aggregation", { description: 'Please try again.' }),
    })
}
