import {Routes, Route} from 'react-router-dom'
import TestAuth from '@/common/test/TestAuth'
import Layout from '@/layout/Layout'
import Dashboard from '@/features/gis/Dashboard'
import ProtectedRoute from './ProtectedRoute'
import Login from '@/features/auth/Login'
import FloodHistory from '@/features/history/FloodHistory'


const Routers = () => {
  return (
    <Routes>
      <Route path='/test-auth' element={<TestAuth />} />
      <Route path='/login' element={<Login />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path='/' element={<Dashboard />} />
        <Route path='/history' element={<FloodHistory />} />
      </Route>
    </Routes>
  )
}

export default Routers