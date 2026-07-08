import { NavLink, Outlet } from 'react-router-dom'
import { Users, SlidersHorizontal, FlaskConical } from 'lucide-react'
import { cn } from '@/common/utils/utils'

// One entry per admin sub-page. Later phases (system ops, settings, audit)
// add entries here — the sidebar itself doesn't change.
const NAV = [
    { name: 'Users', to: '/admin/users', icon: Users },
    { name: 'Model config', to: '/admin/model/config', icon: SlidersHorizontal },
    { name: 'Validation', to: '/admin/model/validation', icon: FlaskConical },
]

const AdminLayout = () => {
    return (
        <div className='flex w-full gap-6 p-4'>
            <aside className='w-48 shrink-0'>
                <h1 className='px-2 pb-3 text-lg font-semibold'>Admin</h1>
                <nav className='flex flex-col gap-1'>
                    {NAV.map(({ name, to, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition',
                                    isActive
                                        ? 'bg-secondary text-foreground'
                                        : 'text-black/60 hover:bg-secondary/60 hover:text-foreground',
                                )
                            }
                        >
                            <Icon className='size-4' />
                            {name}
                        </NavLink>
                    ))}
                </nav>
            </aside>
            <div className='min-w-0 flex-1'>
                <Outlet />
            </div>
        </div>
    )
}

export default AdminLayout
