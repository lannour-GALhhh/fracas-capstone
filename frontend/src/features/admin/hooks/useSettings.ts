import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getRainfallGrid, getSettings, remapRainfallGrid, updateSettings } from '../api/settingsApi'
import type { SettingsByGroup, SettingsGroup } from '../types/settings'
import { adminKeys } from './queryKeys'

/** First DRF field error, e.g. {"renotify_interval_minutes": ["Must be at least 1 minute."]}. */
export const firstFieldError = (error: unknown): string | undefined => {
    const data = (error as { response?: { data?: Record<string, string[] | string> } })?.response
        ?.data
    if (!data) return undefined
    const first = Object.values(data)[0]
    return Array.isArray(first) ? first[0] : first
}

export const useSettings = <G extends SettingsGroup>(group: G) =>
    useQuery({
        queryKey: adminKeys.settings(group),
        queryFn: () => getSettings(group),
    })

/** Save one settings group. Surfaces the backend `clean()` error inline via toast. */
export const useUpdateSettings = <G extends SettingsGroup>(group: G) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: Partial<SettingsByGroup[G]>) => updateSettings(group, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.settings(group) })
            toast.success('Settings saved')
        },
        onError: (error: unknown) => {
            toast.error("Couldn't save settings", {
                description: firstFieldError(error) ?? 'Check the values and try again.',
            })
        },
    })
}

export const useRainfallGrid = () =>
    useQuery({ queryKey: adminKeys.rainfallGrid(), queryFn: getRainfallGrid })

/** Re-map every barangay to its Open-Meteo cell so one fetch serves all barangays in a cell. */
export const useRemapRainfallGrid = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: remapRainfallGrid,
        onSuccess: (data) => {
            queryClient.setQueryData(adminKeys.rainfallGrid(), data)
            const failed = data.failed?.length ?? 0
            toast.success(`${data.mapped} barangays mapped into ${data.cells} cells`, {
                description: failed ? `${failed} could not be mapped; try again.` : undefined,
            })
        },
        onError: () => toast.error("Couldn't re-map the grid", { description: 'Please try again.' }),
    })
}
