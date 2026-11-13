import { Pause, Play } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import { LEAD_HOURS, peakHour } from './scenario'
import SimulationControls from './SimulationControls'
import type { SimulationSession } from './useSimulationSession'

const phaseLabel = (hour: number, duration: number) => {
    if (hour < LEAD_HOURS) return 'before the storm'
    if (hour < LEAD_HOURS + duration) return hour === peakHour(duration) ? 'storm peak' : 'storm'
    return 'after the storm'
}

/** Bottom of the dashboard: the timeline and every scenario control. */
const SimulationBar = ({ session }: { session: SimulationSession }) => {
    const { params, update, hour, hours, playing, togglePlay, scrubTo, targetIds, isError } = session
    return (
        <Card size='sm' className='absolute right-[calc(25%+2rem)] bottom-4 left-16 z-2 gap-3 px-4 py-3'>
            <div className='flex items-center gap-3'>
                <Button size='icon' variant='outline' onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
                    {playing ? <Pause /> : <Play />}
                </Button>
                <input
                    type='range'
                    min={0}
                    max={hours - 1}
                    value={hour}
                    onChange={(e) => scrubTo(Number(e.target.value))}
                    aria-label='Hour of the storm'
                    className='flex-1 accent-primary'
                />
                <span className='w-40 shrink-0 text-right text-xs text-muted-foreground'>
                    Hour {hour} · {phaseLabel(hour, params.durationHours)}
                </span>
            </div>
            <SimulationControls params={params} onChange={update} />
            <p className='text-xs text-muted-foreground'>
                {isError
                    ? "Couldn't run the simulation. Adjust the scenario to retry."
                    : targetIds.length === 0
                      ? 'Click barangays on the map to build a scenario.'
                      : params.mode === 'cluster'
                        ? `${targetIds.length} barangays in the storm cell. Click the map to move its centre.`
                        : `${targetIds.length} selected. Click barangays to add or remove them.`}
            </p>
        </Card>
    )
}

export default SimulationBar
