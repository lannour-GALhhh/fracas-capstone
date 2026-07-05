import { useContext } from 'react'

import { AuthContext } from './authContext'

/** Access the auth session. Throws if used outside `AuthProvider`. */
export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within an AuthProvider')
    return context
}
