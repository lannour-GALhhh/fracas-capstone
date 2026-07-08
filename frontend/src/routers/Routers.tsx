import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/layout/Layout'
import ProtectedRoute from './ProtectedRoute'
import OperatorRoute from './OperatorRoute'
import AdminRoute from './AdminRoute'
import Login from '@/features/auth/Login'
import RouteFallback from '@/common/components/RouteFallback'

// Heavy, route-only screens are code-split so their bundles (MapLibre on the
// dashboard, Recharts on history) load on navigation instead of up front.
// Login + the small guard/layout wrappers stay eager for a fast first paint.
const Dashboard = lazy(() => import('@/features/gis/Dashboard'))
const FloodHistory = lazy(() => import('@/features/history/component/FloodHistory'))
const FloodEventDetail = lazy(() => import('@/features/history/component/FloodEventDetail'))
const AccountPage = lazy(() => import('@/features/user/AccountPage'))
const AlertsPage = lazy(() => import('@/features/alerts/AlertsPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'))
const AdminLayout = lazy(() => import('@/features/admin/AdminLayout'))
const UsersPage = lazy(() => import('@/features/admin/users/UsersPage'))
const UserDetailPage = lazy(() => import('@/features/admin/users/UserDetailPage'))
const ModelConfigPage = lazy(() => import('@/features/admin/model/ModelConfigPage'))
const ModelValidationPage = lazy(() => import('@/features/admin/model/ModelValidationPage'))
const TestAuth = lazy(() => import('@/common/test/TestAuth'))
const NotFound = lazy(() => import('@/common/pages/NotFound'))

const Routers = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path='/test-auth' element={<TestAuth />} />
        <Route path='/login' element={<Login />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path='/' element={<Dashboard />} />
          <Route path='/history' element={<FloodHistory />} />
          <Route path='/history/:id' element={<FloodEventDetail />} />
          <Route path='/me' element={<AccountPage />} />
          <Route path='/alerts' element={<OperatorRoute><AlertsPage /></OperatorRoute>} />
          <Route path='/analytics' element={<OperatorRoute><AnalyticsPage /></OperatorRoute>} />
          <Route path='/admin' element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Navigate to='users' replace />} />
            <Route path='users' element={<UsersPage />} />
            <Route path='users/:id' element={<UserDetailPage />} />
            <Route path='model/config' element={<ModelConfigPage />} />
            <Route path='model/validation' element={<ModelValidationPage />} />
          </Route>
        </Route>
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default Routers