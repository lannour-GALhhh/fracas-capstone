import { Outlet, useLocation } from 'react-router-dom'
import Header from '@/common/components/Header.tsx'
import { PageTransition } from '@/common/motion'

const Layout = () => {
  const { pathname } = useLocation()
  // The dashboard map runs full-bleed under a floating header; every other
  // page keeps a normal scroll area that clears the header with top padding.
  const fullBleed = pathname === '/'

  return (
    <div className='relative h-screen w-full overflow-hidden'>
      <Header />
      {fullBleed ? (
        <div className='absolute inset-0'>
          <PageTransition key={pathname} className='h-full'>
            <Outlet />
          </PageTransition>
        </div>
      ) : (
        <div className='absolute inset-0 overflow-y-auto px-2 pt-16 pb-2'>
          <PageTransition key={pathname} className='min-h-full'>
            <Outlet />
          </PageTransition>
        </div>
      )}
    </div>
  )
}

export default Layout
