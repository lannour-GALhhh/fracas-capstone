import {Routes, Route} from 'react-router-dom'
import TestAuth from '@/common/test/TestAuth'
import Layout from '@/layout/Layout'
import Dashboard from '@/features/gis/Dashboard'
import ProtectedRoute from './ProtectedRoute'
import Login from '@/features/auth/Login'
import FloodHistory from '@/features/history/component/FloodHistory'
import FloodEventDetail from '@/features/history/component/FloodEventDetail'
import NotFound from '@/common/pages/NotFound'
import AccountPage from '@/features/user/AccountPage'
import AlertsPage from '@/features/alerts/AlertsPage'
import OperatorRoute from './OperatorRoute'


const Routers = () => {
  return (
    <Routes>
      <Route path='/test-auth' element={<TestAuth />} />
      <Route path='/login' element={<Login />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path='/' element={<Dashboard />} />
        <Route path='/history' element={<FloodHistory />} />
        <Route path='/history/:id' element={<FloodEventDetail />} />
        <Route path='/me' element={<AccountPage />} />
        <Route path='/alerts' element={<OperatorRoute><AlertsPage /></OperatorRoute>} />
      </Route>
      <Route path='*' element={<NotFound />} />
    </Routes>
  )
}

export default Routers