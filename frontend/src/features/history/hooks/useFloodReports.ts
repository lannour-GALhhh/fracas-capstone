import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createFloodEventReport, getFloodEventReports } from '../api/floodEventsApi'
import { floodEventKeys } from './queryKeys'

/** Evidence reports for a flood event. */
export const useFloodReports = (id: number) =>
    useQuery({
        queryKey: floodEventKeys.reports(id),
        queryFn: () => getFloodEventReports(id),
    })

/** Create an evidence report (multipart), refreshing the report list + audit. */
export const useCreateFloodReport = (id: number) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (form: FormData) => createFloodEventReport(id, form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: floodEventKeys.reports(id) })
            queryClient.invalidateQueries({ queryKey: floodEventKeys.changes(id) })
            toast.success('Evidence report added')
        },
        onError: () => toast.error('Couldn’t add the report', { description: 'Please try again.' }),
    })
}
