import { useInfiniteQuery } from '@tanstack/react-query'

import { getMyReports } from '../api/reportsApi'
import { reportKeys } from '../api/queryKeys'

/** The resident's own submitted reports, newest first, paginated. */
export const useMyReports = () => {
    const query = useInfiniteQuery({
        queryKey: reportKeys.mine,
        queryFn: ({ pageParam }) => getMyReports(pageParam),
        initialPageParam: 1,
        getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
    })
    return { ...query, reports: query.data?.pages.flatMap((p) => p.results) ?? [] }
}
