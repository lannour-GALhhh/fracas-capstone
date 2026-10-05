import { useState } from 'react'
import { Eye, MailCheck, MoreVertical, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/common/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/common/ui/dropdown-menu'
import ConfirmDialog from '@/features/admin/components/ConfirmDialog'
import { useResendActivation, useUpdateAdminUser } from '@/features/admin/hooks/useAdminUserMutations'
import type { AdminUser } from '@/features/admin/types/user'

/** Kebab menu per row: open the account, resend a pending account's activation email, or deactivate/reactivate it (confirmed). */
const AccountRowActions = ({ user, onView }: { user: AdminUser; onView: () => void }) => {
    const update = useUpdateAdminUser(user.id)
    const resend = useResendActivation(user.id)
    // The dialog lives outside the menu so it survives the menu closing.
    const [confirming, setConfirming] = useState(false)
    const deactivating = user.is_active

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant='ghost'
                            size='icon'
                            aria-label={`Actions for ${user.username}`}
                        />
                    }
                >
                    <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-44'>
                    <DropdownMenuItem onClick={onView}>
                        <Eye />
                        View details
                    </DropdownMenuItem>
                    {user.status === 'pending' && (
                        <DropdownMenuItem
                            disabled={resend.isPending}
                            onClick={() => resend.mutate()}
                        >
                            <MailCheck />
                            Resend activation
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        variant={deactivating ? 'destructive' : 'default'}
                        onClick={() => setConfirming(true)}
                    >
                        {deactivating ? <UserX /> : <UserCheck />}
                        {deactivating ? 'Deactivate' : 'Reactivate'}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={deactivating ? 'Deactivate this account?' : 'Reactivate this account?'}
                description={
                    deactivating
                        ? `${user.username} will immediately lose access to the console.`
                        : `${user.username} will regain access immediately.`
                }
                confirmLabel={deactivating ? 'Deactivate' : 'Reactivate'}
                destructive={deactivating}
                isPending={update.isPending}
                onConfirm={() => update.mutate({ is_active: !deactivating })}
            />
        </>
    )
}

export default AccountRowActions
