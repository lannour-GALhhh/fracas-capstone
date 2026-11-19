import type { ReactNode } from 'react'
import type { Role } from '@/common/types/Role'
import AccountAvatar from '@/features/accounts/components/AccountAvatar'
import RoleBadge from './RoleBadge'
import UserActiveBadge from './UserActiveBadge'

interface UserInformationProps {
    first_name: string
    last_name: string
    is_active: boolean
    role: Role
    /** Action buttons (edit profile, change password) shown on the right. */
    actions?: ReactNode
}

/** Profile header: initials avatar, name, role + status, and the account actions. */
const UserInformationCard = ({ first_name, last_name, is_active, role, actions }: UserInformationProps) => {
    return (
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
            <AccountAvatar name={first_name} className='size-16 text-2xl' />
            <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                <h1 className='truncate text-xl font-semibold'>
                    {first_name} {last_name}
                </h1>
                <div className='flex flex-wrap items-center gap-2'>
                    <RoleBadge role={role} />
                    <UserActiveBadge isActive={is_active} />
                </div>
            </div>
            {actions && <div className='flex flex-wrap gap-2'>{actions}</div>}
        </div>
    )
}

export default UserInformationCard
