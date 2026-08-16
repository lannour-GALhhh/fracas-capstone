import { useState } from 'react'
import { Siren } from 'lucide-react'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import LoadingCard from '@/common/components/LoadingCard'
import ErrorState from '@/common/components/ErrorState'
import { cn } from '@/common/utils/utils'
import { useActiveEvacuations } from './hooks/useActiveEvacuations'
import EvacuationCard from './component/EvacuationCard'
import EvacuationHistoryTable from './component/EvacuationHistoryTable'

type Tab = 'active' | 'history'

const TABS: { value: Tab; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'history', label: 'History' },
]

/**
 * Operator console for evacuations, in two views.
 *
 * **Active** — live cards for every open evacuation: roster progress
 * (evacuated / moving / unaccounted of the subscriber roster) drilling down to
 * the per-resident report list. Reads the one shared cached aggregate the GIS
 * ping badges also use.
 *
 * **History** — the archive of stood-down evacuations, answered from the counts
 * frozen on each row at stand-down (so it survives the retention purge of the
 * per-resident rows).
 */
const EvacuationPage = () => {
    const [tab, setTab] = useState<Tab>('active')
    const { data, isLoading, isError, refetch } = useActiveEvacuations()
    const evacuations = data ?? []

    return (
        <div className='w-full p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>Evacuations</h1>
                    <p className='text-xs text-black/50'>
                        {tab === 'active'
                            ? 'Track who has reached safety during an active evacuation'
                            : 'Past evacuations and how they ended'}
                    </p>
                </div>
                {tab === 'active' && !isLoading && !isError && (
                    <Badge variant='secondary' className='h-6'>
                        {evacuations.length} active
                    </Badge>
                )}
            </div>

            <div
                role='tablist'
                aria-label='Evacuation views'
                className='border-border mt-4 flex gap-1 border-b'
            >
                {TABS.map((t) => (
                    <Button
                        key={t.value}
                        role='tab'
                        aria-selected={tab === t.value}
                        variant='ghost'
                        size='sm'
                        className={cn(
                            'cursor-pointer rounded-b-none border-b-2 border-transparent',
                            tab === t.value
                                ? 'border-foreground font-medium'
                                : 'text-black/50 hover:text-black/80',
                        )}
                        onClick={() => setTab(t.value)}
                    >
                        {t.label}
                    </Button>
                ))}
            </div>

            {tab === 'active' ? (
                <div className='mt-4 flex flex-col gap-3'>
                    {isLoading && <LoadingCard />}
                    {isError && (
                        <ErrorState
                            variant='inline'
                            title='Evacuations unavailable'
                            message='We couldn’t load the active evacuations. It should be back after a quick retry.'
                            onRetry={() => refetch()}
                        />
                    )}
                    {!isLoading && !isError && evacuations.length === 0 && (
                        <Card className='items-center gap-2 py-12 text-center'>
                            <Siren className='text-muted-foreground size-8' />
                            <p className='font-medium'>No active evacuations</p>
                            <p className='text-muted-foreground max-w-sm text-sm'>
                                When a barangay turns critical or an operator pings one, it appears
                                here with live evacuation tracking.
                            </p>
                        </Card>
                    )}
                    {evacuations.map((evac) => (
                        <EvacuationCard key={evac.evacuation_id} evac={evac} />
                    ))}
                </div>
            ) : (
                <EvacuationHistoryTable />
            )}
        </div>
    )
}

export default EvacuationPage
