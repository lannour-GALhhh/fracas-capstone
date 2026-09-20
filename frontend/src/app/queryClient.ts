import { QueryClient } from '@tanstack/react-query'

// Avoids refetch storms while keeping the console reasonably live.
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
