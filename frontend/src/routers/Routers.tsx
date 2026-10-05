import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/layout/Layout'
import ProtectedRoute from './ProtectedRoute'
import OperatorRoute from './OperatorRoute'
import AdminRoute from './AdminRoute'
import Login from '@/features/auth/Login'
import AccountActivation from '@/features/auth/AccountActivation'
import ForgotPassword from '@/features/auth/ForgotPassword'
import ResetPassword from '@/features/auth/ResetPassword'
import RouteFallback from '@/common/components/RouteFallback'

// Heavy route screens are code-split; login + guard/layout wrappers stay eager.
const Dashboard = lazy(() => import('@/features/gis/Dashboard'))
const FloodHistory = lazy(() => import('@/features/history/component/FloodHistory'))
const FloodEventDetail = lazy(() => import('@/features/history/component/FloodEventDetail'))
const AccountPage = lazy(() => import('@/features/user/AccountPage'))
const EvacuationPage = lazy(() => import('@/features/evacuation/EvacuationPage'))
const CentersPage = lazy(() => import('@/features/centers/CentersPage'))
const AdminLayout = lazy(() => import('@/features/admin/AdminLayout'))
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage'))
const ModelConfigPage = lazy(() => import('@/features/admin/model/ModelConfigPage'))
const ModelValidationPage = lazy(() => import('@/features/admin/model/ModelValidationPage'))
const SystemPage = lazy(() => import('@/features/admin/system/SystemPage'))
const SettingsPage = lazy(() => import('@/features/admin/settings/SettingsPage'))
const TestAuth = lazy(() => import('@/common/test/TestAuth'))
const NotFound = lazy(() => import('@/common/pages/NotFound'))

const Routers = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path='/test-auth' element={<TestAuth />} />
        <Route path='/login' element={<Login />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password/:uid/:token' element={<ResetPassword />} />
        <Route path='/account-activation/:token' element={<AccountActivation />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path='/' element={<Dashboard />} />
          <Route path='/history' element={<FloodHistory />} />
          <Route path='/history/:id' element={<FloodEventDetail />} />
          <Route path='/me' element={<AccountPage />} />
          <Route path='/evacuation' element={<OperatorRoute><EvacuationPage /></OperatorRoute>} />
          <Route path='/evacuation-centers' element={<OperatorRoute><CentersPage /></OperatorRoute>} />
          <Route path='/accounts' element={<AdminRoute><AccountsPage /></AdminRoute>} />
          {/* Analytics is hidden for now: re-add the route + nav link to bring it back. */}
          <Route path='/admin' element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Navigate to='model/config' replace />} />
            <Route path='users' element={<Navigate to='/accounts' replace />} />
            <Route path='model/config' element={<ModelConfigPage />} />
            <Route path='model/validation' element={<ModelValidationPage />} />
            <Route path='evacuation' element={<Navigate to='/evacuation-centers' replace />} />
            <Route path='system' element={<SystemPage />} />
            <Route path='settings' element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default Routers