import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/common/ui/card'
import { Badge } from '@/common/ui/badge'
import type { PipelineStage, SystemStatus } from '../../types/system'
import { lastRunLabel } from '../utils'

const STAGES: { key: keyof SystemStatus['pipeline']; label: string }[] = [
    { key: 'rainfall', label: 'Rainfall ingest' },
    { key: 'scoring', label: 'Risk scoring' },
    { key: 'evacuation', label: 'Evacuation sync' },
]

const StageRow = ({ label, stage }: { label: string; stage: PipelineStage }) => (
    <div className='flex items-center justify-between text-sm'>
        <span className='flex items-center gap-2'>
            <span
                className={`inline-block size-2 rounded-full ${stage.fresh ? 'bg-emerald-500' : 'bg-amber-500'}`}
                aria-hidden
            />
            {label}
        </span>
        <span className='flex items-center gap-2 text-muted-foreground'>
            {lastRunLabel(stage.last_run)}
            {!stage.fresh && stage.last_run && <Badge variant='outline'>stale</Badge>}
        </span>
    </div>
)

/** Per-stage freshness for the ingest -> score -> evacuation pipeline. */
const PipelineStages = ({ status }: { status: SystemStatus }) => (
    <Card>
        <CardHeader>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>Last run of each stage in the 15-minute cycle.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-2'>
            {STAGES.map(({ key, label }) => (
                <StageRow key={key} label={label} stage={status.pipeline[key]} />
            ))}
        </CardContent>
    </Card>
)

export default PipelineStages
