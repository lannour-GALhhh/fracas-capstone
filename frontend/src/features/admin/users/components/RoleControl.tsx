import { useState } from 'react'
import { Button } from '@/common/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/common/ui/select'
import capitalize from '@/common/utils/capitalize'
import type { Role } from '@/common/types/Role'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useUpdateAdminUser } from '../../hooks/useAdminUserMutations'
import type { AdminUser, UpdateUserPayload } from '../../types/user'

/** Flag combination for each console role. `is_superuser` is never touched here. */
const ROLE_PATCH: Record<Role, UpdateUserPayload> = {
    resident: { is_operator: false, is_staff: false },
    operator: { is_operator: true, is_staff: false },
    admin: { is_operator: false, is_staff: true },
}

/** Pick a target role and apply it behind a confirm dialog. */
const RoleControl = ({ user }: { user: AdminUser }) => {
    const [target, setTarget] = useState<Role>(user.role)
    const update = useUpdateAdminUser(user.id)

    // Adjust-during-render: re-sync the pending selection once the mutation
    // resolves and the detail query refetches with the new role.
    const [lastRole, setLastRole] = useState(user.role)
    if (user.role !== lastRole) {
        setLastRole(user.role)
        setTarget(user.role)
    }

    const changed = target !== user.role

    return (
        <div className='flex items-center gap-2'>
            <Select value={target} onValueChange={(v) => setTarget(v as Role)}>
                <SelectTrigger className='w-36'>
                    <SelectValue>{(v) => capitalize(v as string)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='resident'>Resident</SelectItem>
                    <SelectItem value='operator'>Operator</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                </SelectContent>
            </Select>
            {changed && (
                <ConfirmDialog
                    trigger={
                        <Button size='sm'>Apply</Button>
                    }
                    title={`Change role to ${capitalize(target)}?`}
                    description={`This updates ${user.username}'s console permissions immediately.`}
                    confirmLabel='Change role'
                    isPending={update.isPending}
                    onConfirm={() => update.mutate(ROLE_PATCH[target])}
                />
            )}
        </div>
    )
}

export default RoleControl
