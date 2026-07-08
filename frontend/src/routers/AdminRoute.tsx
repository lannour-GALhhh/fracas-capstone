import { useAuth } from '@/features/auth/context/useAuth'
import { Navigate } from 'react-router-dom'
import React from 'react'

/**
 * Gate admin-only console routes. Assumes an authenticated user (nest inside
 * `ProtectedRoute`); a signed-in resident or operator is bounced to the
 * dashboard. The API remains the real gate — this only hides UI they can't use.
 */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAdmin } = useAuth()
    return isAdmin ? children : <Navigate to={'/'} replace />
}

export default AdminRoute
