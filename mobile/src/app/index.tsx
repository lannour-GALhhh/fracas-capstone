import { Redirect } from 'expo-router'

import { Spinner } from '@/common/ui'
import { useAuth } from '@/features/auth/context/useAuth'

/**
 * Entry redirect. While the stored session is validated we show a splash;
 * then we send the user into the app tabs or the auth stack.
 */
export default function Index() {
    const { isInitializing, isAuthenticated } = useAuth()

    if (isInitializing) return <Spinner />
    return <Redirect href={isAuthenticated ? '/status' : '/login'} />
}
