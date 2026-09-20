import { formatDistanceToNow } from 'date-fns'
import { Waves } from 'lucide-react'
import { Badge } from '@/common/ui/badge'
import ErrorState from '@/common/components/ErrorState'
import { Stagger, StaggerItem } from '@/common/motion'
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
    const floods = useMyFloodActivity()

    const floodRows = floods.data?.results.slice(0, LIMIT) ?? []

    return (
        <div className='flex flex-col gap-6'>
            <SectionShell icon={<Waves className='size-4' />} title='Flood-event actions'>
                {floods.isLoading && <Empty text='Loading…' />}
                {floods.isError && (
                    <ErrorState
                        variant='inline'
                        title='Couldn’t load activity'
                        message='Your recent flood-event actions didn’t load just now.'
                        onRetry={() => floods.refetch()}
                    />
                )}
                {!floods.isLoading && !floods.isError && floodRows.length === 0 && (
                    <Empty text='No flood-event actions yet.' />
                )}
                <Stagger className='flex flex-col gap-2'>
                    {floodRows.map((c) => (
                        <StaggerItem key={c.id}>
                            <FloodRow change={c} />
                        </StaggerItem>
                    ))}
                </Stagger>
            </SectionShell>
        </div>
    )
}

export default OperatorActivity
