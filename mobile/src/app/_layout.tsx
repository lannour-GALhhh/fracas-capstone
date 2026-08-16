import { QueryClientProvider } from '@tanstack/react-query'
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ThemeProvider, useThemeControls } from '@/common/theme'
import { queryClient } from '@/core/queryClient'
import { AuthProvider } from '@/features/auth/context/AuthProvider'

/**
 * Root layout — app-wide providers wrap every route.
 * Order mirrors the web `main.tsx`: theme → query cache → auth session → navigator.
 * `GestureHandlerRootView` is required for the drawer's swipe-to-open gesture.
 */
export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <QueryClientProvider client={queryClient}>
                        <AuthProvider>
                            <ThemedStatusBar />
                            <Slot />
                        </AuthProvider>
                    </QueryClientProvider>
                </ThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    )
}

/** Status bar contrast follows the app's scheme, not the device's. */
function ThemedStatusBar() {
    const { scheme } = useThemeControls()
    return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
}
