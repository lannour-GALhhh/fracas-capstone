import { QueryClient } from '@tanstack/react-query'

// The backend pipeline recomputes at most hourly, so data is fresh for minutes,
// not seconds. Defaults here avoid refetch storms while keeping the console live.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000, // 1 min: risk snapshot changes on the pipeline cadence
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})
