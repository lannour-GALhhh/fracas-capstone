import type { Role } from '@/common/types/Role'
import { Badge } from '@/common/ui/badge'
import capitalize from '@/common/utils/capitalize'

const RoleBadge = ({
    role
}: { role: Role }) => {
    return (
        <Badge className='bg-blue-400'>{capitalize(role)}</Badge>
    )
}

export default RoleBadge