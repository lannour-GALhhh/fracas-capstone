import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from '@/common/components/Header.tsx'
const Layout = () => {
  return (
    <div className='w-full h-screen min-h-screen flex flex-col'>
        <Header />
        <div className='flex-1 p-2 relative'>
          <Outlet />
        </div>
    </div>
  )
}

export default Layout