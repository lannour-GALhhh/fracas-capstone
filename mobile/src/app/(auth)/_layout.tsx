import { Redirect, Stack } from 'expo-router'

import { Spinner } from '@/common/ui'
import { useAuth } from '@/features/auth/context/useAuth'

/** Auth stack (login + register). Redirects into the app once signed in. */
export default function AuthLayout() {
    const { isInitializing, isAuthenticated } = useAuth()

    if (isInitializing) return <Spinner />
    if (isAuthenticated) return <Redirect href="/status" />

    return <Stack screenOptions={{ headerShown: false }} />
}
