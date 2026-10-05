import { Badge } from '@/common/ui/badge'
import { cn } from '@/common/utils/utils'
import type { UserStatus } from '@/features/admin/types/user'

export const STATUS_LABEL: Record<UserStatus, string> = {
    active: 'Active',
    pending: 'Pending',
    inactive: 'Inactive',
}

const TONE: Record<UserStatus, { badge: string; dot: string; text: string }> = {
    active: { badge: 'bg-green-100', dot: 'bg-green-500', text: 'text-green-600' },
    pending: { badge: 'bg-amber-100', dot: 'bg-amber-500', text: 'text-amber-600' },
    inactive: { badge: 'bg-red-100', dot: 'bg-red-500', text: 'text-red-600' },
}

/** `status` wins when given; `isActive` keeps older callers (own-account card) working. */
const UserActiveBadge = ({
    isActive = true,
    status,
    showDot = true,
}: { isActive: boolean; status?: UserStatus; showDot?: boolean }) => {
    const key: UserStatus = status ?? (isActive ? 'active' : 'inactive')
    const tone = TONE[key]
    return (
        <Badge className={cn('gap-2', tone.badge)}>
            {showDot && <div className={cn('h-2 aspect-square rounded-full', tone.dot)} />}
            <p className={tone.text}>{STATUS_LABEL[key]} Account</p>
        </Badge>
    )
}

export default UserActiveBadge
