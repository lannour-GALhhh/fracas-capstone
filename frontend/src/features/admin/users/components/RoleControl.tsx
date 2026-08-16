import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

/** Pick a target role and apply it behind a confirm dialog.
 *
 * "Resident" is the revoke path: it strips console access, and because the
 * console only manages operators/admins, the account then disappears from this
 * section entirely — so the dialog says so and we return to the list after. */
const RoleControl = ({ user }: { user: AdminUser }) => {
    const navigate = useNavigate()
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
    const revoking = target === 'resident'

    const apply = () =>
        update.mutate(ROLE_PATCH[target], {
            onSuccess: () => {
                if (revoking) navigate('/admin/users')
            },
        })

    return (
        <div className='flex items-center gap-2'>
            <Select value={target} onValueChange={(v) => setTarget(v as Role)}>
                <SelectTrigger className='w-36'>
                    <SelectValue>{(v) => capitalize(v as string)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='operator'>Operator</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                    <SelectItem value='resident'>Resident (no console access)</SelectItem>
                </SelectContent>
            </Select>
            {changed && (
                <ConfirmDialog
                    trigger={
                        <Button size='sm'>Apply</Button>
                    }
                    title={revoking ? 'Revoke console access?' : `Change role to ${capitalize(target)}?`}
                    description={
                        revoking
                            ? `${user.username} keeps their account but loses the console, and will no longer appear under Users. Restoring access requires the Django admin site.`
                            : `This updates ${user.username}'s console permissions immediately.`
                    }
                    confirmLabel={revoking ? 'Revoke access' : 'Change role'}
                    destructive={revoking}
                    isPending={update.isPending}
                    onConfirm={apply}
                />
            )}
        </div>
    )
}

export default RoleControl
