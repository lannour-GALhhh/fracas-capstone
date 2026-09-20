import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/common/ui/card'
import type { CadenceEntry } from '../../types/system'

/** Read-only schedule from schedules.py; runtime editing is deferred. */
const CadenceList = ({ cadence }: { cadence: CadenceEntry[] }) => (
    <Card>
        <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Periodic tasks (read-only).</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-2'>
            {cadence.map((entry) => (
                <div key={entry.task} className='flex items-center justify-between text-sm'>
                    <span className='font-mono text-xs text-muted-foreground'>{entry.task}</span>
                    <span>{entry.cadence}</span>
                </div>
            ))}
        </CardContent>
    </Card>
)

export default CadenceList
