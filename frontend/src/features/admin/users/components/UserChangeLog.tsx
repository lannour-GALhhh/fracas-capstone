import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import { cn } from '@/common/utils/utils'
import { useAdminUserChanges } from '../../hooks/useAdminUsers'

const PAGE_SIZE = 25

/** Friendly labels for the audited fields, including the role/status flags
 * that only an admin edit ever touches. */
const FIELD_LABELS: Record<string, string> = {
    first_name: 'First name',
    last_name: 'Last name',
    email: 'Email',
    phone_number: 'Phone number',
    address: 'Address',
    is_operator: 'Operator access',
    is_staff: 'Admin access',
    is_active: 'Account status',
}

const displayValue = (value: string) => {
    if (value === 'True') return 'Yes'
    if (value === 'False') return 'No'
    return value || '—'
}

/** A user's account-change audit trail, as seen from the admin console. */
const UserChangeLog = ({ userId }: { userId: number }) => {
    const [page, setPage] = useState(1)
    const { data, isLoading, isError } = useAdminUserChanges(userId, page)

    const rows = data?.results ?? []
    const count = data?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

    return (
        <div className='flex flex-col gap-3'>
            {isLoading && <p className='text-sm text-black/40'>Loading…</p>}
            {isError && <p className='text-sm text-destructive'>Couldn't load this account's history.</p>}
            {!isLoading && !isError && rows.length === 0 && (
                <p className='text-sm text-black/40'>No changes recorded yet.</p>
            )}

            <div className='flex flex-col gap-3'>
                {rows.map((change) => {
                    const isPassword = change.action === 'password_changed'
                    const when = new Date(change.changed_at)
                    return (
                        <div key={change.id} className='border-l-2 border-border pl-3'>
                            <div className='flex items-center justify-between gap-2'>
                                <span className='flex items-center gap-2 text-sm font-medium'>
                                    <Badge variant='secondary' className='font-normal'>
                                        {isPassword ? 'Password reset' : 'Updated'}
                                    </Badge>
                                    {!isPassword && (FIELD_LABELS[change.field] ?? change.field)}
                                </span>
                                <span
                                    className='shrink-0 text-xs text-black/50'
                                    title={when.toLocaleString()}
                                >
                                    {formatDistanceToNow(when, { addSuffix: true })}
                                </span>
                            </div>
                            {!isPassword && (
                                <div className='mt-1 flex flex-wrap items-center gap-1.5 text-xs'>
                                    <span className='rounded bg-muted px-1.5 py-0.5 text-black/60 line-through'>
                                        {displayValue(change.old_value)}
                                    </span>
                                    <ArrowRight className='size-3 text-black/40' />
                                    <span className='rounded bg-muted px-1.5 py-0.5 font-medium'>
                                        {displayValue(change.new_value)}
                                    </span>
                                </div>
                            )}
                            <p className='mt-1 text-xs text-black/40'>
                                by {change.actor_name ?? 'System'}
                            </p>
                        </div>
                    )
                })}
            </div>

            {totalPages > 1 && (
                <div className='flex items-center justify-end gap-2'>
                    <Button
                        size='sm'
                        variant='ghost'
                        className={cn(page === 1 && 'pointer-events-none opacity-50')}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className='text-xs text-black/50'>
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        size='sm'
                        variant='ghost'
                        className={cn(page === totalPages && 'pointer-events-none opacity-50')}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}

export default UserChangeLog
