import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useRiskMap } from '@/features/gis/hooks/useRiskMap'
import { useHomeBarangay } from '@/features/status/hooks/useHomeBarangay'

import { getSubscriptions, subscribe, unsubscribe } from '../api/alertsApi'
import { alertKeys } from '../api/queryKeys'

export interface HomeSubscription {
    /** The resident's home barangay id (null until address + boundaries resolve). */
    barangayId: number | null
    barangayName: string | null
    /** True once a subscription row exists for the home barangay. */
    isSubscribed: boolean
    /** Flip the subscription on/off. No-op until the home barangay is known. */
    toggle: () => void
    isPending: boolean
    isLoading: boolean
}

/**
 * The subscription that actually turns alerts on for a resident: the backend only
 * fans out to `Subscription` rows, so a resident must be subscribed to their home
 * barangay to receive anything. Resolves the home barangay from the saved address,
 * then exposes an on/off toggle over `/api/account/subscriptions/`.
 */
export const useHomeSubscription = (): HomeSubscription => {
    const qc = useQueryClient()
    const { features } = useRiskMap()
    const home = useHomeBarangay(features)
    const barangayId = home.feature?.properties.id ?? null

    const subs = useQuery({
        queryKey: alertKeys.subscriptions,
        queryFn: getSubscriptions,
        staleTime: 5 * 60_000,
    })

    const subscription = subs.data?.find((s) => s.barangay === barangayId) ?? null
    const invalidate = () => qc.invalidateQueries({ queryKey: alertKeys.subscriptions })

    const subscribeMut = useMutation({
        mutationFn: () => subscribe(barangayId as number),
        onSuccess: invalidate,
    })
    const unsubscribeMut = useMutation({
        mutationFn: () => unsubscribe(subscription!.id),
        onSuccess: invalidate,
    })

    const toggle = () => {
        if (barangayId == null) return
        if (subscription) unsubscribeMut.mutate()
        else subscribeMut.mutate()
    }

    return {
        barangayId,
        barangayName: home.name,
        isSubscribed: Boolean(subscription),
        toggle,
        isPending: subscribeMut.isPending || unsubscribeMut.isPending,
        isLoading: home.isLoading || subs.isLoading,
    }
}

/**
 * Alerts for the home barangay are always on: once the home barangay resolves and
 * the subscription list has loaded, subscribe to it if no row exists yet.
 */
export const useAutoSubscribeHome = (): void => {
    const home = useHomeSubscription()
    const qc = useQueryClient()
    const attempted = useRef<number | null>(null)
    const { barangayId, isSubscribed, isLoading, isPending } = home

    useEffect(() => {
        if (barangayId == null || isLoading || isPending || isSubscribed) return
        if (attempted.current === barangayId) return
        attempted.current = barangayId
        subscribe(barangayId)
            .then(() => qc.invalidateQueries({ queryKey: alertKeys.subscriptions }))
            .catch(() => {
                attempted.current = null
            })
    }, [barangayId, isLoading, isPending, isSubscribed, qc])
}
