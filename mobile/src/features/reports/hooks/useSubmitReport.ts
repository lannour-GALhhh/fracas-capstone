import { useMutation, useQueryClient } from '@tanstack/react-query'

import { reportKeys } from '../api/queryKeys'
import { submitReport } from '../api/reportsApi'

export const useSubmitReport = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: submitReport,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.mine }),
    })
}
