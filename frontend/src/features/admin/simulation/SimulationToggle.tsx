import { Card, CardDescription, CardHeader, CardTitle } from '@/common/ui/card'
import { Switch } from '@/common/ui/switch'
import { setSimulationEnabled, useSimulationEnabled } from './simulationStore'

/** Opens/closes the simulation; the simulation itself runs on the dashboard. */
const SimulationToggle = () => {
    const enabled = useSimulationEnabled()
    return (
        <Card>
            <CardHeader className='flex-row items-start justify-between gap-4'>
                <div>
                    <CardTitle>Rainfall simulation</CardTitle>
                    <CardDescription>
                        Turn this on, then open the dashboard to try out a storm: vary rainfall over selected
                        barangays or a random cluster and watch the clouds, rain and flood risk it produces. Uses
                        the active risk model; nothing is saved and no alerts are sent. Only you see it.
                    </CardDescription>
                </div>
                <Switch checked={enabled} onCheckedChange={setSimulationEnabled} aria-label='Enable rainfall simulation' />
            </CardHeader>
        </Card>
    )
}

export default SimulationToggle
