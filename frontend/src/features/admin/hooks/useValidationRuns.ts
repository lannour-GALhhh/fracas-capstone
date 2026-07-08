import { useQuery } from '@tanstack/react-query'
import { keepPreviousData } from '@tanstack/react-query'
import { getValidationRun, getValidationRuns } from '../api/modelApi'
import type { ValidationRun } from '../types/model'
import { adminKeys } from './queryKeys'

const IN_FLIGHT = new Set<ValidationRun['status']>(['pending', 'running'])

/** Paginated hindcast runs. Polls while any run on the page is still in flight. */
export const useValidationRuns = (page: number) =>
    useQuery({
        queryKey: adminKeys.validationRuns(page),
        queryFn: () => getValidationRuns(page),
        placeholderData: keepPreviousData,
        refetchInterval: (query) =>
            query.state.data?.results.some((r) => IN_FLIGHT.has(r.status)) ? 3000 : false,
    })

/** Single run, polled until it leaves pending/running. `enabled` lets callers
 * (e.g. a detail dialog) skip fetching/polling while closed. */
export const useValidationRun = (id: number, enabled = true) =>
    useQuery({
        queryKey: adminKeys.validationRun(id),
        queryFn: () => getValidationRun(id),
        enabled,
        refetchInterval: (query) => (query.state.data && IN_FLIGHT.has(query.state.data.status) ? 3000 : false),
    })
