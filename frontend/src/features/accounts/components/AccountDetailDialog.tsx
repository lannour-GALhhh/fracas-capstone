import { useState } from 'react'
import { CalendarDays, Clock, History, Mail, Phone, type LucideIcon } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/common/ui/dialog'
import ErrorState from '@/common/components/ErrorState'
import RoleBadge from '@/features/user/components/RoleBadge'
import UserActiveBadge from '@/features/user/components/UserActiveBadge'
import { useAdminUser } from '@/features/admin/hooks/useAdminUsers'
import AccountAvatar from './AccountAvatar'
import StatusControl from './StatusControl'
import UserChangeLog from './UserChangeLog'

const Field = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => (
    <div className='flex items-start gap-3'>
        <Icon className='mt-1 size-5 shrink-0 text-black/40' />
        <div>
            <p className='text-sm text-black/40'>{label}</p>
            <p className='text-base font-medium'>{value || '—'}</p>
        </div>
    </div>
)

interface Props {
    userId: number | null
    onClose: () => void
}

/** One account's profile and role/status controls; its audit trail opens in a nested modal. */
const AccountDetailDialog = ({ userId, onClose }: Props) => {
    const [historyOpen, setHistoryOpen] = useState(false)
    const { data: user, isLoading, isError, refetch } = useAdminUser(userId ?? 0)

    const name = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : ''

    return (
        <Dialog open={userId !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
                {isLoading && <p className='text-sm text-black/50'>Loading…</p>}
                {(isError || (!isLoading && !user)) && (
                    <ErrorState
                        variant='inline'
                        title="Couldn't load this account"
                        message='It may have been removed, or the request failed.'
                        onRetry={() => refetch()}
                    />
                )}
                {user && (
                    <>
                        <DialogHeader>
                            <div className='flex flex-wrap items-center justify-between gap-2 pr-8'>
                                <div className='flex items-center gap-3'>
                                    <AccountAvatar
                                        name={user.first_name.trim() || user.username}
                                        className='size-12 text-lg'
                                    />
                                    <div>
                                        <DialogTitle className='text-xl font-semibold'>{name}</DialogTitle>
                                        <DialogDescription>{user.username}</DialogDescription>
                                    </div>
                                </div>
                                <div className='flex flex-col items-end gap-1.5'>
                                    <RoleBadge role={user.role} />
                                    <UserActiveBadge isActive={user.is_active} status={user.status} showDot={false} />
                                </div>
                            </div>
                        </DialogHeader>

                        <Card size='sm' className='flex flex-col gap-4'>
                            <h2 className='text-sm font-semibold'>Details</h2>
                            <Field icon={Mail} label='Email' value={user.email} />
                            <Field icon={Phone} label='Phone number' value={user.phone_number ?? ''} />
                            <Field icon={CalendarDays} label='Joined' value={new Date(user.date_joined).toLocaleDateString()} />
                            <Field
                                icon={Clock}
                                label='Last login'
                                value={user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                            />
                        </Card>

                        <div className='flex items-center justify-between gap-2'>
                        <Button
                            variant='outline'
                            className='w-fit cursor-pointer'
                            onClick={() => setHistoryOpen(true)}
                        >
                            <History className='size-4' />
                            Account History
                        </Button>
                            <StatusControl user={user} />
                        </div>

                        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                            <DialogContent
                                overlayClassName='bg-black/30 supports-backdrop-filter:backdrop-blur-md'
                                className='max-h-[85vh] overflow-y-auto sm:max-w-xl'
                            >
                                <DialogHeader>
                                    <DialogTitle>Account history</DialogTitle>
                                </DialogHeader>
                                <UserChangeLog userId={user.id} />
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default AccountDetailDialog
