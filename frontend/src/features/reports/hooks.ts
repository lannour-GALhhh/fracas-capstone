import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { blockReporter, getFloodReports, reviewFloodReport, unblockReporter } from './api'
import type { BlockInput, ReportFilters, ReviewInput } from './types'

export const reportKeys = {
    all: ['floodReports'] as const,
    list: (filters: ReportFilters) => ['floodReports', 'list', filters] as const,
}

export const useFloodReportQueue = (filters: ReportFilters) =>
    useQuery({
        queryKey: reportKeys.list(filters),
        queryFn: () => getFloodReports(filters),
        placeholderData: keepPreviousData,
    })

export const useReviewReport = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...payload }: ReviewInput & { id: number }) => reviewFloodReport(id, payload),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: reportKeys.all })
            queryClient.invalidateQueries({ queryKey: ['floodEvents'] })
            toast.success(vars.status === 'verified' ? 'Report verified' : 'Report rejected')
        },
        onError: () => toast.error('Couldn’t save the review', { description: 'Please try again.' }),
    })
}

export const useBlockReporter = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...payload }: BlockInput & { id: number }) => blockReporter(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reportKeys.all })
            toast.success('Sender blocked from reporting')
        },
        onError: () => toast.error('Couldn’t block the sender', { description: 'Please try again.' }),
    })
}

export const useUnblockReporter = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: unblockReporter,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reportKeys.all })
            toast.success('Sender unblocked')
        },
        onError: () => toast.error('Couldn’t unblock the sender', { description: 'Please try again.' }),
    })
}
