import { Button } from '@/common/ui/button'
import ConfirmDialog from '@/features/admin/components/ConfirmDialog'
import { useUpdateAdminUser } from '@/features/admin/hooks/useAdminUserMutations'
import type { AdminUser } from '@/features/admin/types/user'

/** Deactivate/reactivate behind a confirm dialog. */
const StatusControl = ({ user }: { user: AdminUser }) => {
    const update = useUpdateAdminUser(user.id)

    if (user.is_active) {
        return (
            <ConfirmDialog
                trigger={
                    <Button variant='destructive'>
                        Deactivate
                    </Button>
                }
                title='Deactivate this account?'
                description={`${user.username} will immediately lose access to the console.`}
                confirmLabel='Deactivate'
                destructive
                isPending={update.isPending}
                onConfirm={() => update.mutate({ is_active: false })}
            />
        )
    }

    return (
        <ConfirmDialog
            trigger={
                <Button variant='outline'>
                    Reactivate
                </Button>
            }
            title='Reactivate this account?'
            description={`${user.username} will regain access immediately.`}
            confirmLabel='Reactivate'
            isPending={update.isPending}
            onConfirm={() => update.mutate({ is_active: true })}
        />
    )
}

export default StatusControl
