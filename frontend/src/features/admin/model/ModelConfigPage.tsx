import { Button } from '@/common/ui/button'
import RiskConfigsTable from './components/RiskConfigsTable'
import RiskConfigFormDialog from './components/RiskConfigFormDialog'

/** Phase 2 admin console: calibrate scoring weights/thresholds and pick the
 * config the pipeline reads. Exactly one config is active at a time. */
const ModelConfigPage = () => {
    return (
        <div className='w-full'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>Model configuration</h1>
                    <p className='text-xs text-black/50'>
                        Tune factor weights and category thresholds, then activate a config.
                    </p>
                </div>
                <RiskConfigFormDialog trigger={<Button size='sm'>New config</Button>} />
            </div>

            <div className='mt-4'>
                <RiskConfigsTable />
            </div>
        </div>
    )
}

export default ModelConfigPage
