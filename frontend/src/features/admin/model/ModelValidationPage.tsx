import { Button } from '@/common/ui/button'
import { useCreateValidationRun } from '../hooks/useModelMutations'
import ValidationRunsTable from './components/ValidationRunsTable'

/** Phase 2 admin console: trigger hindcast validation runs against the active
 * config and browse recall/hits/mean-score history. */
const ModelValidationPage = () => {
    const createRun = useCreateValidationRun()

    return (
        <div className='w-full'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>Model validation</h1>
                    <p className='text-xs text-black/50'>
                        Hindcast the active config against recorded flood events. Runs execute
                        asynchronously — this page polls until they finish.
                    </p>
                </div>
                <Button size='sm' onClick={() => createRun.mutate()} disabled={createRun.isPending}>
                    {createRun.isPending ? 'Starting…' : 'Run validation'}
                </Button>
            </div>

            <div className='mt-4'>
                <ValidationRunsTable />
            </div>
        </div>
    )
}

export default ModelValidationPage
