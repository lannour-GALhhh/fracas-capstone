import { useAuth } from '@/features/auth/context/useAuth'
import { Navigate } from 'react-router-dom'
import React from 'react'

/** Gate operator-only routes; nest inside `ProtectedRoute`. UI gate only, not the real one. */
const OperatorRoute = ({ children }: { children: React.ReactNode }) => {
    const { isOperator } = useAuth()
    return isOperator ? children : <Navigate to={'/'} replace />
}

export default OperatorRoute
