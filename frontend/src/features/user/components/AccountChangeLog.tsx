import { formatDistanceToNow } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/common/ui/badge'
import { useAccountChanges } from '../hooks/useAccountChanges'
import type { AccountChange } from '../types'

/** How many recent rows to show. */
const LIMIT = 8

/** Friendly labels for the audited profile fields. */
const FIELD_LABELS: Record<string, string> = {
    first_name: 'First name',
    last_name: 'Last name',
    email: 'Email',
    phone_number: 'Phone number',
    address: 'Address',
}

const ChangeRow = ({ change }: { change: AccountChange }) => {
    const when = new Date(change.changed_at)
    const isPassword = change.action === 'password_changed'
    const fieldLabel = FIELD_LABELS[change.field] ?? change.field

    return (
        <div className='border-l-2 border-border pl-3'>
            <div className='flex items-center justify-between gap-2'>
                <span className='flex items-center gap-2 text-sm font-medium'>
                    <Badge variant='secondary' className='font-normal'>
                        {isPassword ? 'Password changed' : 'Updated'}
                    </Badge>
                    {!isPassword && fieldLabel}
                </span>
                <span className='shrink-0 text-xs text-black/50' title={when.toLocaleString()}>
                    {formatDistanceToNow(when, { addSuffix: true })}
                </span>
            </div>

            {!isPassword && (
                <div className='mt-1 flex flex-wrap items-center gap-1.5 text-xs'>
                    <span className='rounded bg-muted px-1.5 py-0.5 text-black/60 line-through'>
                        {change.old_value || '—'}
                    </span>
                    <ArrowRight className='size-3 text-black/40' />
                    <span className='rounded bg-muted px-1.5 py-0.5 font-medium'>
                        {change.new_value || '—'}
                    </span>
                </div>
            )}
        </div>
    )
}

/** History of changes to the signed-in user's own account. */
const AccountChangeLog = () => {
    const { data, isLoading, isError } = useAccountChanges()
    const rows = data?.results.slice(0, LIMIT) ?? []

    return (
        <div className='flex flex-col gap-3'>
            {isLoading && <p className='text-sm text-black/40'>Loading…</p>}
            {isError && (
                <p className='text-sm text-destructive'>Couldn&apos;t load your account history.</p>
            )}
            {!isLoading && !isError && rows.length === 0 && (
                <p className='text-sm text-black/40'>No account changes yet.</p>
            )}
            {rows.map((change) => (
                <ChangeRow key={change.id} change={change} />
            ))}
        </div>
    )
}

export default AccountChangeLog
