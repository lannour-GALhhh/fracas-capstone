import { useAuth } from '@/features/auth/context/useAuth'
import { Navigate } from 'react-router-dom';
import React from 'react'

const ProtectedRoute = ({children}: {children:React.ReactNode}) => {

    const {isAuthenticated, isInitializing} = useAuth();

    if (isInitializing) return <h5>Loading...</h5>

    return isAuthenticated ? children : <Navigate to={'/login'} />
}

export default ProtectedRoute