import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    getAutoDetectConfig,
    getSystemStatus,
    runPipeline,
    runRetention,
    updateAutoDetectConfig,
} from '../api/systemApi'
import type { AutoDetectConfig } from '../types/system'
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

/** Kick the ingest -> score -> evacuation pipeline off-cycle. Results land on the
 * next status refresh, so nudge the status query afterward. */
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
