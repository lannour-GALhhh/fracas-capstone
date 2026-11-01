import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/context/useAuth'
import {
    declareRadiusEvacuation,
    getRadiusEvacuations,
    getRadiusHistory,
    standDownRadiusEvacuation,
} from '../api/radiusApi'

const radiusKeys = {
    active: ['evacuation', 'radius', 'active'] as const,
    history: ['evacuation', 'radius', 'history'] as const,
}

const REFRESH_MS = 30_000

export const useRadiusEvacuations = () => {
    const { isOperator } = useAuth()
    return useQuery({
        queryKey: radiusKeys.active,
        queryFn: getRadiusEvacuations,
        refetchInterval: REFRESH_MS,
        enabled: isOperator,
    })
}

export const useRadiusHistory = () =>
    useQuery({ queryKey: radiusKeys.history, queryFn: getRadiusHistory })

export const useDeclareRadiusEvacuation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: declareRadiusEvacuation,
        onSuccess: (evac) => {
            queryClient.invalidateQueries({ queryKey: radiusKeys.active })
            toast.success('Point evacuation declared', {
                description: `${evac.radius_m.toLocaleString()} m around the marked point · ${
                    evac.barangays.map((b) => b.name).join(', ') || 'no barangay'
                }.`,
            })
        },
        onError: () =>
            toast.error('Couldn’t declare the evacuation', {
                description: 'Nothing was sent. Please try again.',
            }),
    })
}

export const useStandDownRadiusEvacuation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: standDownRadiusEvacuation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: radiusKeys.active })
            queryClient.invalidateQueries({ queryKey: radiusKeys.history })
            toast.success('Point evacuation stood down')
        },
        onError: () => toast.error('Couldn’t stand down the evacuation', { description: 'Please try again.' }),
    })
}
