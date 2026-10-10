import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getFloodReports, reviewFloodReport } from './api'
import type { ReportFilters, ReviewInput } from './types'

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
