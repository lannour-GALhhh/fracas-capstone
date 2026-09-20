import { Skeleton } from '@/common/ui/skeleton'
import ErrorState from '@/common/components/ErrorState'
import { useSystemStatus } from '../hooks/useSystem'
import AutoDetectCard from './components/AutoDetectCard'
import CadenceList from './components/CadenceList'
import HealthOverview from './components/HealthOverview'
import OpsActions from './components/OpsActions'
import PipelineStages from './components/PipelineStages'

/** Admin console: operational health, manual pipeline triggers, schedule, auto-detect config. */
const SystemPage = () => {
    const { data, isLoading, isError, refetch } = useSystemStatus()

    return (
        <div className='w-full'>
            <div>
                <h1 className='text-2xl font-semibold'>System</h1>
                <p className='text-xs text-black/50'>
                    Pipeline health and operations. This page refreshes automatically.
                </p>
            </div>

            {isLoading && (
                <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                    <Skeleton className='h-40' />
                    <Skeleton className='h-40' />
                </div>
            )}

            {isError && (
                <ErrorState
                    className='mt-6'
                    message="Couldn't load system status."
                    onRetry={() => refetch()}
                />
            )}

            {data && (
                <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                    <HealthOverview status={data} />
                    <PipelineStages status={data} />
                    <OpsActions />
                    <CadenceList cadence={data.cadence} />
                    <div className='sm:col-span-2'>
                        <AutoDetectCard />
                    </div>
                </div>
            )}
        </div>
    )
}

export default SystemPage
