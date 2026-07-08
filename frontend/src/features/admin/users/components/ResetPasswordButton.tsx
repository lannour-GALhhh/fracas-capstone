import { useState } from 'react'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/common/ui/dialog'
import { Button } from '@/common/ui/button'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useResetAdminUserPassword } from '../../hooks/useAdminUserMutations'
import type { AdminUser } from '../../types/user'

/** Generate a new password for the account and reveal it once. */
const ResetPasswordButton = ({ user }: { user: AdminUser }) => {
    const reset = useResetAdminUserPassword(user.id)
    const [revealed, setRevealed] = useState<string | null>(null)

    return (
        <>
            <ConfirmDialog
                trigger={
                    <Button size='sm' variant='outline'>
                        Reset password
                    </Button>
                }
                title='Reset password?'
                description={`Generates a new password for ${user.username}. Their current password stops working immediately.`}
                confirmLabel='Reset password'
                isPending={reset.isPending}
                onConfirm={() =>
                    reset.mutate(undefined, {
                        onSuccess: (result) => setRevealed(result.password),
                    })
                }
            />

            <Dialog open={revealed !== null} onOpenChange={(open) => !open && setRevealed(null)}>
                <DialogContent className='sm:max-w-sm'>
                    <DialogHeader>
                        <DialogTitle>New password</DialogTitle>
                        <DialogDescription>
                            Share this with {user.username} now — it won't be shown again.
                        </DialogDescription>
                    </DialogHeader>
                    <code className='block rounded bg-muted px-3 py-2 font-mono text-sm select-all'>
                        {revealed}
                    </code>
                    <DialogFooter>
                        <DialogClose render={<Button />}>Done</DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default ResetPasswordButton
