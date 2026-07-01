import type { Role } from '@/common/types/Role'
import { Card, CardTitle } from '@/common/ui/card'
import capitalize from '@/common/utils/capitalize'
import React from 'react'
import RoleBadge from './RoleBadge'
import UserActiveBadge from './UserActiveBadge'

interface UserInformationProps {
    first_name: string,
    last_name: string,
    role: Role,
    is_active: boolean
}

const UserInformationCard = ({
    first_name,
    last_name,
    role,
    is_active
}: UserInformationProps) => {
    return (
        <div className='flex flex-col gap-4 items-center'>
            <div className='bg-blue-500 w-24 rounded-full aspect-square flex justify-center items-center'>
                <h1 className='text-4xl font-semibold text-white'>{first_name[0]}</h1>
            </div>

            <Card className='flex items-center w-full'>
                <h2 className='text-xl font-semibold'>{first_name} {last_name}</h2>
                <RoleBadge role={role} />
                <UserActiveBadge isActive={is_active} />
            </Card>
        </div>
    )
}

export default UserInformationCard