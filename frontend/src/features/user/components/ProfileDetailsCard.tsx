import { Label } from '@/common/ui/label'
import { Separator } from '@/common/ui/separator'
import React from 'react'

interface ProfileDetailsProps {
    email: string,
    phone_number: string,
}

const ProfileDetailsCard = ({
    email,
    phone_number
}: ProfileDetailsProps) => {
    return (
        <div className='flex flex-col gap-4 px-8' >
            <Label className='text-sm text-black/50 -mb-2'>Email</Label>
            <h4>{email}</h4>
            <Separator></Separator>
            <Label className='text-sm text-black/50 -mb-2'>Phone Number</Label>
            <h4>{phone_number}</h4>
        </div>
    )
}

export default ProfileDetailsCard