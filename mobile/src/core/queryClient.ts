/**
 * TanStack Query client + offline persistence. Same tuned defaults as the web
 * (data is fresh for minutes, not seconds, since the pipeline runs ~every 15 min),
 * wrapped with an AsyncStorage persister so the app cold-starts with last-known
 * barangays/snapshot/dam/centers with no network.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

const ONE_DAY = 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000, // 1 min: snapshot/dam change on the pipeline cadence
            gcTime: ONE_DAY, // keep cached data long enough to rehydrate offline
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})

const persister = createAsyncStoragePersister({ storage: AsyncStorage })

persistQueryClient({ queryClient, persister, maxAge: ONE_DAY })
