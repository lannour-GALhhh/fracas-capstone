import { useState } from 'react'
import { ButtonGroup, ButtonGroupSeparator } from '../ui/button-group'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/features/auth/context/useAuth'
import { useCurrentUser } from '@/features/user/hooks/useCurrentUser'
import RoleBadge from '@/features/user/components/RoleBadge'
import type { CurrentUser } from '@/features/user/types'



const Title = ({title}: {title: string}) => {
    return (
        <div className='flex items-center gap-1'>
            <h1 className='font-semibold tracking-wide text-black/75'>{title}</h1>
        </div>
    )
}

/** A circular initial badge shared by the trigger chip and the menu header. */
const Initial = ({ name, className }: { name: string; className?: string }) => (
    <div
        className={`bg-blue-600 flex aspect-square items-center justify-center rounded-full ${className ?? ''}`}
    >
        <span className='font-bold uppercase text-white'>{name[0]}</span>
    </div>
)

/** Avatar chip that opens a menu: quick user info, account settings, logout. */
const UserMenu = ({ name, user }: { name: string; user?: CurrentUser }) => {
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()
    const { logout } = useAuth()

    const goToAccount = () => {
        setOpen(false)
        navigate('/me')
    }

    const onLogout = async () => {
        setOpen(false)
        try {
            await logout()
        } finally {
            navigate('/login')
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <button
                        type='button'
                        className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition hover:bg-secondary'
                    />
                }
            >
                <Initial name={name} className='w-6 text-xs' />
                <span className='text-sm font-medium'>{name}</span>
            </PopoverTrigger>
            <PopoverContent align='end' className='w-64 gap-0 p-0'>
                <div className='flex items-center gap-3 p-3'>
                    <Initial name={name} className='w-10 text-base' />
                    <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold'>{name}</p>
                        {user?.email && (
                            <p className='truncate text-xs text-black/50'>{user.email}</p>
                        )}
                    </div>
                </div>
                {user && (
                    <div className='px-3 pb-2'>
                        <RoleBadge role={user.role} />
                    </div>
                )}
                <Separator />
                <div className='flex flex-col p-1'>
                    <button
                        type='button'
                        onClick={goToAccount}
                        className='flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-secondary'
                    >
                        <Settings className='size-4 text-black/60' />
                        Account settings
                    </button>
                    <button
                        type='button'
                        onClick={onLogout}
                        className='flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive transition hover:bg-destructive/10'
                    >
                        <LogOut className='size-4' />
                        Logout
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

const Header = () => {

    const { isOperator } = useAuth()
    const { data: user } = useCurrentUser()

    // Fall back to a neutral label until the profile query resolves.
    const displayName = user
        ? `${user.first_name} ${user.last_name}`.trim() || user.username
        : '…'

    const links = [
        {name: "Dashboard", link: "/"},
        {name: "Flood History", link: "/history"},
        {name: "Analytics", link: "/analytics"}, {name: "Alerts", link: "/alerts"},
    ]

    const linkList = links.map(({name, link}, index) =>
            <>
                <Button 
                variant="link"
                key={link}>
                <Link to={link}>{name}</Link>
                </Button>
                {index !== links.length - 1 &&
                    
                    <ButtonGroupSeparator />
                }
            </>
    )

    return (
        <header className='absolute inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-black/5 px-4 backdrop-blur'>
            <Title title="FRACAS" />
            <ButtonGroup className='bg-white rounded-2xl ml-auto mr-8 border'>
                {linkList}
            </ButtonGroup>
            <UserMenu name={displayName} user={user} />
        </header>
    )
}

export default Header