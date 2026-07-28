import { Siren } from 'lucide-react'
import { Badge } from '@/common/ui/badge'
import { Card } from '@/common/ui/card'
import LoadingCard from '@/common/components/LoadingCard'
import ErrorState from '@/common/components/ErrorState'
import { useActiveEvacuations } from './hooks/useActiveEvacuations'
import EvacuationCard from './component/EvacuationCard'

/**
 * Operator console: live view of every active evacuation. Each card shows the
 * roster progress (evacuated / moving / unaccounted of the subscriber roster)
 * and drills down to the per-resident report list. Reads the one shared cached
 * aggregate the GIS ping badges also use.
 */
const EvacuationPage = () => {
    const { data, isLoading, isError, refetch } = useActiveEvacuations()
    const evacuations = data ?? []

    return (
        <div className='w-full p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>Evacuations</h1>
                    <p className='text-xs text-black/50'>
                        Track who has reached safety during an active evacuation
                    </p>
                </div>
                {!isLoading && !isError && (
                    <Badge variant='secondary' className='h-6'>
                        {evacuations.length} active
                    </Badge>
                )}
            </div>

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
                            When a barangay turns critical or an operator pings one, it appears here
                            with live evacuation tracking.
                        </p>
                    </Card>
                )}
                {evacuations.map((evac) => (
                    <EvacuationCard key={evac.evacuation_id} evac={evac} />
                ))}
            </div>
        </div>
    )
}

export default EvacuationPage
