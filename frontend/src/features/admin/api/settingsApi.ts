import apiClient from '@/app/apiClient'
import type { SettingsByGroup, SettingsGroup } from '../types/settings'

/** Each settings group is one admin-gated singleton endpoint. */
const GROUP_URL: Record<SettingsGroup, string> = {
    retention: '/api/admin/settings/retention/',
    organization: '/api/admin/settings/organization/',
    toggles: '/api/admin/settings/toggles/',
    registration: '/api/admin/settings/registration/',
}

export const getSettings = async <G extends SettingsGroup>(
    group: G,
): Promise<SettingsByGroup[G]> => {
    const { data } = await apiClient.get<SettingsByGroup[G]>(GROUP_URL[group])
    return data
}

export const updateSettings = async <G extends SettingsGroup>(
    group: G,
    payload: Partial<SettingsByGroup[G]>,
): Promise<SettingsByGroup[G]> => {
    const { data } = await apiClient.patch<SettingsByGroup[G]>(GROUP_URL[group], payload)
    return data
}
