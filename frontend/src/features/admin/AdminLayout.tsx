import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Users, SlidersHorizontal, FlaskConical } from 'lucide-react'
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from '@/common/ui/sidebar'

// One entry per admin sub-page. Later phases (system ops, settings, audit)
// add entries here — the sidebar itself doesn't change.
const NAV = [
    { name: 'Users', to: '/admin/users', icon: Users },
    { name: 'Model config', to: '/admin/model/config', icon: SlidersHorizontal },
    { name: 'Validation', to: '/admin/model/validation', icon: FlaskConical },
]

const AdminLayout = () => {
    const { pathname } = useLocation()

    return (
        <SidebarProvider className='min-h-0 items-start gap-6'>
            {/* collapsible="none": this sidebar lives inside the app's own scrollable
                page area, not a full-page shell, so it stays a normal flow element
                instead of the offcanvas/icon variants' fixed-to-viewport positioning. */}
            <Sidebar collapsible='none' className='w-56 shrink-0 rounded-lg border border-sidebar-border'>
                <SidebarHeader>
                    <h1 className='px-2 pt-1 text-lg font-semibold'>Admin</h1>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {NAV.map(({ name, to, icon: Icon }) => (
                                    <SidebarMenuItem key={to}>
                                        <SidebarMenuButton
                                            isActive={pathname.startsWith(to)}
                                            render={<NavLink to={to} />}
                                        >
                                            <Icon className='size-4' />
                                            <span>{name}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
            <div className='min-w-0 flex-1'>
                <Outlet />
            </div>
        </SidebarProvider>
    )
}

export default AdminLayout
