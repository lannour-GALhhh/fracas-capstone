import { Card, CardContent, CardHeader, CardTitle } from '@/common/ui/card'
import { Badge } from '@/common/ui/badge'
import type { GisImport } from '../../types/gisImport'

const KIND_LABEL = { boundary: 'Barangay boundaries', susceptibility: 'Flood susceptibility',
    streets: 'High-risk streets',
} as const

const summarize = (job: GisImport) => {
    if (job.status === 'failed') return job.message
    if (job.status !== 'succeeded') return 'Processing…'
    const r = job.result
    if (job.kind === 'boundary') return `${r.created} created, ${r.updated} updated, ${r.skipped} skipped`
    if (job.kind === 'streets') return `${r.streets} streets saved across ${r.barangays} barangays`
    return `${r.loaded} zone rows loaded (replaced ${r.replaced})`
}

const variant = (s: GisImport['status']) =>
    s === 'failed' ? 'destructive' : s === 'succeeded' ? 'secondary' : 'outline'

/** Recent uploads and their outcome. */
const ImportHistory = ({ jobs }: { jobs: GisImport[] }) => (
    <Card>
        <CardHeader>
            <CardTitle>Recent imports</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
            {jobs.length === 0 && <p className='text-sm text-muted-foreground'>No imports yet.</p>}
            {jobs.map((job) => (
                <div key={job.id} className='flex items-start justify-between gap-3 text-sm'>
                    <div className='min-w-0'>
                        <p className='font-medium'>{KIND_LABEL[job.kind]}</p>
                        <p className='truncate text-xs text-muted-foreground'>
                            {job.filename} · {new Date(job.created_at).toLocaleString()}
                            {job.created_by ? ` · ${job.created_by}` : ''}
                        </p>
                        <p className='text-xs'>{summarize(job)}</p>
                    </div>
                    <Badge variant={variant(job.status)}>{job.status}</Badge>
                </div>
            ))}
        </CardContent>
    </Card>
)

export default ImportHistory
