import { CloudRain, Power } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import SimulationSummary from './SimulationSummary'
import { setSimulationEnabled } from './simulationStore'
import type { SimulationSession } from './useSimulationSession'

/** Lower right of the dashboard: what the simulation shows this hour, and a quick way out. */
const SimulationCard = ({ session }: { session: SimulationSession }) => (
    <Card size='sm' className='absolute right-4 bottom-4 z-2 w-1/4 gap-3 px-3 py-3'>
        <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2 text-sm font-semibold'>
                <CloudRain className='size-4' /> Rainfall Simulation
            </div>
            <Button size='sm' variant='destructive' onClick={() => setSimulationEnabled(false)}>
                <Power /> Turn off
            </Button>
        </div>
        <p className='text-xs text-muted-foreground'>
            Hypothetical rain on the active model. The live data below is hidden; nothing is saved or sent.
        </p>
        {session.results.length > 0 && <SimulationSummary results={session.results} hour={session.hour} />}
    </Card>
)

export default SimulationCard
