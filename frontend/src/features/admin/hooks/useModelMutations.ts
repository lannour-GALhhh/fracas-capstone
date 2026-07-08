import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    activateRiskConfig,
    createRiskConfig,
    createValidationRun,
    updateRiskConfig,
} from '../api/modelApi'
import type { CreateRiskConfigPayload, UpdateRiskConfigPayload } from '../types/model'

const fieldErrorMessage = (error: unknown): string | undefined => {
    const data = (error as { response?: { data?: Record<string, string[] | string> } })?.response
        ?.data
    if (!data) return undefined
    const first = Object.values(data)[0]
    return Array.isArray(first) ? first[0] : first
}

/** Create a new (inactive) scoring config. */
export const useCreateRiskConfig = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: CreateRiskConfigPayload) => createRiskConfig(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'risk-configs'] })
            toast.success('Config created')
        },
        onError: (error: unknown) => {
            toast.error("Couldn't create the config", {
                description: fieldErrorMessage(error) ?? 'Check the weights and thresholds.',
            })
        },
    })
}

/** Edit a draft (inactive) config's weights/thresholds. */
export const useUpdateRiskConfig = (id: number) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: UpdateRiskConfigPayload) => updateRiskConfig(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'risk-configs'] })
            toast.success('Config updated')
        },
        onError: (error: unknown) => {
            toast.error("Couldn't update the config", {
                description: fieldErrorMessage(error) ?? 'Check the weights and thresholds.',
            })
        },
    })
}

/** Make a config the one the scoring pipeline reads. */
export const useActivateRiskConfig = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => activateRiskConfig(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'risk-configs'] })
            toast.success('Config activated')
        },
        onError: () => {
            toast.error("Couldn't activate the config", { description: 'Please try again.' })
        },
    })
}

/** Trigger a hindcast run against the currently active config (async). */
export const useCreateValidationRun = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createValidationRun,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'validation-runs'] })
            toast.success('Validation run started')
        },
        onError: () => {
            toast.error("Couldn't start the run", { description: 'Please try again.' })
        },
    })
}
