import { useAuth } from '@/features/auth/context/useAuth'
import { Navigate } from 'react-router-dom'
import React from 'react'

/** Gate admin-only routes; nest inside `ProtectedRoute`. UI gate only, not the real one. */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAdmin } = useAuth()
    return isAdmin ? children : <Navigate to={'/'} replace />
}

export default AdminRoute
