import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/common/ui/card'
import ErrorState from '@/common/components/ErrorState'
import RoleBadge from '@/features/user/components/RoleBadge'
import UserActiveBadge from '@/features/user/components/UserActiveBadge'
import { useAdminUser } from '../hooks/useAdminUsers'
import RoleControl from './components/RoleControl'
import StatusControl from './components/StatusControl'
import ResetPasswordButton from './components/ResetPasswordButton'
import UserChangeLog from './components/UserChangeLog'

const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className='text-xs text-black/40'>{label}</p>
        <p className='text-sm font-medium'>{value || '—'}</p>
    </div>
)

/** Admin console: one account's profile, role/status controls, and audit trail. */
const UserDetailPage = () => {
    const { id } = useParams()
    const userId = Number(id)
    const { data: user, isLoading, isError, refetch } = useAdminUser(userId)

    if (isLoading) return <p className='text-sm text-black/50'>Loading…</p>
    if (isError || !user) {
        return (
            <ErrorState
                variant='inline'
                title="Couldn't load this account"
                message='It may have been removed, or the request failed.'
                onRetry={() => refetch()}
            />
        )
    }

    const name = `${user.first_name} ${user.last_name}`.trim() || user.username

    return (
        <div className='flex flex-col gap-4'>
            <Link
                to='/admin/users'
                className='flex w-fit items-center gap-1 text-sm text-black/50 hover:text-foreground'
            >
                <ArrowLeft className='size-4' />
                Back to users
            </Link>

            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>{name}</h1>
                    <p className='text-xs text-black/50'>@{user.username}</p>
                </div>
                <div className='flex items-center gap-2'>
                    <RoleBadge role={user.role} />
                    <UserActiveBadge isActive={user.is_active} />
                </div>
            </div>

            <Card size='sm' className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                <Field label='Email' value={user.email} />
                <Field label='Phone number' value={user.phone_number ?? ''} />
                <Field label='Phone verified' value={user.phone_verified ? 'Yes' : 'No'} />
                <Field label='Joined' value={new Date(user.date_joined).toLocaleDateString()} />
                <Field
                    label='Last login'
                    value={user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                />
            </Card>

            <Card size='sm' className='flex flex-col gap-4'>
                <h2 className='text-sm font-semibold'>Access</h2>
                <div className='flex flex-wrap items-center gap-6'>
                    <div>
                        <p className='mb-1 text-xs text-black/40'>Console role</p>
                        <RoleControl user={user} />
                    </div>
                    <div>
                        <p className='mb-1 text-xs text-black/40'>Account status</p>
                        <StatusControl user={user} />
                    </div>
                    <div>
                        <p className='mb-1 text-xs text-black/40'>Password</p>
                        <ResetPasswordButton user={user} />
                    </div>
                </div>
            </Card>

            <Card size='sm' className='flex flex-col gap-3'>
                <h2 className='text-sm font-semibold'>Account history</h2>
                <UserChangeLog userId={user.id} />
            </Card>
        </div>
    )
}

export default UserDetailPage
