import apiClient from '@/core/apiClient'

import type {
    Device,
    Notification,
    NotificationPreference,
    Paginated,
    Subscription,
} from '../types'

// --- In-app notifications feed -------------------------------------------------

/** One page of the resident's notifications (newest first, size 25). */
export const getNotifications = async (page = 1): Promise<Paginated<Notification>> => {
    const { data } = await apiClient.get<Paginated<Notification>>('/api/notifications/', {
        params: { page },
    })
    return data
}

/** Unread tally for the tab badge / bell — cheaper than fetching a page. */
export const getUnreadCount = async (): Promise<number> => {
    const { data } = await apiClient.get<{ count: number }>('/api/notifications/unread_count/')
    return data.count
}

export const markNotificationRead = async (id: number): Promise<void> => {
    await apiClient.post(`/api/notifications/${id}/read/`)
}

// --- Delivery preferences ------------------------------------------------------

export const getPreferences = async (): Promise<NotificationPreference> => {
    const { data } = await apiClient.get<NotificationPreference>('/api/account/preferences/')
    return data
}

export const updatePreferences = async (
    patch: Partial<NotificationPreference>,
): Promise<NotificationPreference> => {
    const { data } = await apiClient.patch<NotificationPreference>('/api/account/preferences/', patch)
    return data
}

// --- Push devices --------------------------------------------------------------

export const registerDevice = async (
    token: string,
    platform: Device['platform'],
): Promise<Device> => {
    const { data } = await apiClient.post<Device>('/api/account/devices/', { token, platform })
    return data
}

export const unregisterDevice = async (id: number): Promise<void> => {
    await apiClient.delete(`/api/account/devices/${id}/`)
}

export const getDevices = async (): Promise<Device[]> => {
    const { data } = await apiClient.get<Paginated<Device>>('/api/account/devices/')
    return data.results
}

// --- Barangay subscriptions (who a fan-out reaches) ----------------------------

export const getSubscriptions = async (): Promise<Subscription[]> => {
    const { data } = await apiClient.get<Paginated<Subscription>>('/api/account/subscriptions/')
    return data.results
}

/** Idempotent server-side (get_or_create): re-subscribing is a no-op. */
export const subscribe = async (barangay: number): Promise<Subscription> => {
    const { data } = await apiClient.post<Subscription>('/api/account/subscriptions/', { barangay })
    return data
}

export const unsubscribe = async (id: number): Promise<void> => {
    await apiClient.delete(`/api/account/subscriptions/${id}/`)
}
