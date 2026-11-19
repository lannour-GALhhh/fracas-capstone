import { useQuery } from '@tanstack/react-query'

import { getMyReportBlock } from '../api/reportsApi'
import { reportKeys } from '../api/queryKeys'

/** The resident's own report ban status; refreshed on every mount so a lift shows promptly. */
export const useMyReportBlock = () =>
    useQuery({
        queryKey: reportKeys.block,
        queryFn: getMyReportBlock,
        staleTime: 0,
    })
