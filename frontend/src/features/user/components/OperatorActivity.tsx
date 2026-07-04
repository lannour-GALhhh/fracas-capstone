import { formatDistanceToNow } from 'date-fns'
import { Megaphone, Waves } from 'lucide-react'
import { Badge } from '@/common/ui/badge'
import { useAlertEvents } from '@/features/alerts/hooks/useAlertEvents'
import type { AlertEvent } from '@/features/alerts/types/api'
import { useMyFloodActivity } from '../hooks/useMyActivity'
import type { FloodActivity, FloodActivityAction } from '../types'

/** How many recent rows each section shows. */
const LIMIT = 5

const ACTION_LABELS: Record<FloodActivityAction, string> = {
    created: 'Created',
    updated: 'Updated',
    confirmed: 'Confirmed',
    resolved: 'Resolved',
    deleted: 'Deleted',
    restored: 'Restored',
}

/** A relative timestamp with the absolute time on hover. */
const When = ({ iso }: { iso: string }) => (
    <span className='shrink-0 text-xs text-black/50' title={new Date(iso).toLocaleString()}>
        {formatDistanceToNow(new Date(iso), { addSuffix: true })}
    </span>
)

const SectionShell = ({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode
    title: string
    children: React.ReactNode
}) => (
    <section className='flex flex-col gap-2'>
        <h3 className='flex items-center gap-2 text-sm font-semibold text-black/70'>
            {icon}
            {title}
        </h3>
        {children}
    </section>
)

const Empty = ({ text }: { text: string }) => (
    <p className='text-sm text-black/40'>{text}</p>
)

const BroadcastRow = ({ event }: { event: AlertEvent }) => (
    <div className='flex items-center justify-between gap-2 border-l-2 border-border pl-3'>
        <span className='truncate text-sm'>
            <span className='font-medium'>{event.barangay_name ?? '—'}</span>
            <span className='text-black/50'>
                {' · '}
                {event.recipients} {event.recipients === 1 ? 'recipient' : 'recipients'}
            </span>
        </span>
        <When iso={event.created_at} />
    </div>
)

const FloodRow = ({ change }: { change: FloodActivity }) => (
    <div className='flex items-center justify-between gap-2 border-l-2 border-border pl-3'>
        <span className='flex min-w-0 items-center gap-2 text-sm'>
            <Badge variant='secondary' className='font-normal'>
                {ACTION_LABELS[change.action] ?? change.action}
            </Badge>
            <span className='truncate font-medium'>{change.barangay_name ?? '—'}</span>
        </span>
        <When iso={change.changed_at} />
    </div>
)

/** The account page's right column: what this operator has actually done. */
const OperatorActivity = () => {
    const broadcasts = useAlertEvents({ kind: 'broadcast', triggered_by: 'me' })
    const floods = useMyFloodActivity()

    const broadcastRows = broadcasts.data?.results.slice(0, LIMIT) ?? []
    const floodRows = floods.data?.results.slice(0, LIMIT) ?? []

    return (
        <div className='flex flex-col gap-6'>
            <SectionShell icon={<Megaphone className='size-4' />} title='Broadcasts sent'>
                {broadcasts.isLoading && <Empty text='Loading…' />}
                {broadcasts.isError && (
                    <p className='text-sm text-destructive'>Couldn&apos;t load your broadcasts.</p>
                )}
                {!broadcasts.isLoading && !broadcasts.isError && broadcastRows.length === 0 && (
                    <Empty text='No broadcasts yet.' />
                )}
                {broadcastRows.map((e) => (
                    <BroadcastRow key={e.id} event={e} />
                ))}
            </SectionShell>

            <SectionShell icon={<Waves className='size-4' />} title='Flood-event actions'>
                {floods.isLoading && <Empty text='Loading…' />}
                {floods.isError && (
                    <p className='text-sm text-destructive'>Couldn&apos;t load your activity.</p>
                )}
                {!floods.isLoading && !floods.isError && floodRows.length === 0 && (
                    <Empty text='No flood-event actions yet.' />
                )}
                {floodRows.map((c) => (
                    <FloodRow key={c.id} change={c} />
                ))}
            </SectionShell>
        </div>
    )
}

export default OperatorActivity
