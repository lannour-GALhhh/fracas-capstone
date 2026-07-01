import { Badge } from '@/common/ui/badge'
import { cn } from '@/common/utils/utils'
import React from 'react'

const UserActiveBadge = ({
    isActive = true
}: { isActive: boolean }) => {
    return (
        <Badge className={cn('bg-green-100 gap-2', !isActive && 'bg-red-100')}>
            <div className={cn('h-2 aspect-square rounded-full bg-green-500', !isActive && 'bg-red-500')} />
            <p className={cn('text-green-600', !isActive && 'text-red-600')}>
                {isActive ? 'Active Account' : 'Inactive Account'}
            </p>
        </Badge>
    )
}

export default UserActiveBadge