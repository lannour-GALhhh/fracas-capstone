import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, Map, Settings, CloudRain, UserPlus, DatabaseZap } from 'lucide-react'
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

// One entry per admin sub-page.
const NAV = [
    { name: 'System', to: '/admin/system', icon: Activity },
    { name: 'GIS data', to: '/admin/gis', icon: Map },
    { name: 'General', to: '/admin/settings/general', icon: Settings },
    { name: 'Rainfall', to: '/admin/settings/rainfall', icon: CloudRain },
    { name: 'Registration', to: '/admin/settings/registration', icon: UserPlus },
    { name: 'Retention', to: '/admin/settings/retention', icon: DatabaseZap },
]

const AdminLayout = () => {
    const { pathname } = useLocation()

    return (
        <SidebarProvider className='min-h-0 items-start gap-4 p-4'>
            {/* collapsible="none": this sidebar lives inside the app's own scrollable
                page area, not a full-page shell, so it stays a normal flow element
                instead of the offcanvas/icon variants' fixed-to-viewport positioning. */}
            <Sidebar collapsible='none' className='rounded-lg border border-sidebar-border'>
                <SidebarHeader>
                    Administrator
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
