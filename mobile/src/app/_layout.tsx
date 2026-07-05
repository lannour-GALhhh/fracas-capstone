import { QueryClientProvider } from '@tanstack/react-query'
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { queryClient } from '@/core/queryClient'
import { AuthProvider } from '@/features/auth/context/AuthProvider'

/**
 * Root layout — app-wide providers wrap every route.
 * Order mirrors the web `main.tsx`: query cache → auth session → navigator.
 */
export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <StatusBar style="auto" />
                    <Slot />
                </AuthProvider>
            </QueryClientProvider>
        </SafeAreaProvider>
    )
}
