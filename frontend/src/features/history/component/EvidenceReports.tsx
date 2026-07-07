import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Camera, ImagePlus, Plus, User, X } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/common/ui/dialog'
import { Button } from '@/common/ui/button'
import { Card, CardContent, CardTitle } from '@/common/ui/card'
import { Label } from '@/common/ui/label'
import { Textarea } from '@/common/ui/textarea'
import { Separator } from '@/common/ui/separator'
import { DateTimePicker } from '@/common/ui/datetime-picker'
import { useAuth } from '@/features/auth/context/useAuth'
import { useCreateFloodReport, useFloodReports } from '../hooks/useFloodReports'
import type { FloodEventReport } from '../types/api'

/** Current local time as the `YYYY-MM-DDTHH:mm` value DateTimePicker expects. */
const nowLocal = (): string => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const AddReportDialog = ({ eventId }: { eventId: number }) => {
    const [open, setOpen] = useState(false)
    const [description, setDescription] = useState('')
    const [occurredAt, setOccurredAt] = useState(nowLocal())
    const [files, setFiles] = useState<File[]>([])
    const create = useCreateFloodReport(eventId)

    // Object URLs for previews; revoked when the selection changes/unmounts.
    const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
    useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews])

    const reset = () => {
        setDescription('')
        setOccurredAt(nowLocal())
        setFiles([])
    }

    const submit = () => {
        const form = new FormData()
        form.append('description', description)
        form.append('occurred_at', occurredAt)
        files.forEach((f) => form.append('uploaded_images', f))
        create.mutate(form, {
            onSuccess: () => {
                reset()
                setOpen(false)
            },
        })
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next)
                if (!next) reset()
            }}
        >
            <DialogTrigger
                render={
                    <Button size='sm' variant='outline' className='cursor-pointer'>
                        <Plus className='size-4' />
                        Add report
                    </Button>
                }
            />
            <DialogContent className='max-w-lg'>
                <DialogHeader>
                    <DialogTitle>Add evidence report</DialogTitle>
                    <DialogDescription>
                        Attach photos and a description as evidence for this flood event.
                    </DialogDescription>
                </DialogHeader>

                <div className='flex flex-col gap-3'>
                    <div className='flex flex-col gap-1'>
                        <Label>Date &amp; time captured</Label>
                        <DateTimePicker value={occurredAt} onChange={setOccurredAt} />
                    </div>

                    <div className='flex flex-col gap-1'>
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder='What the photos show, conditions on the ground, etc.'
                        />
                    </div>

                    <div className='flex flex-col gap-1'>
                        <Label>Photos</Label>
                        <label className='hover:bg-muted flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground transition-colors'>
                            <ImagePlus className='size-4' />
                            Choose images
                            <input
                                type='file'
                                accept='image/*'
                                multiple
                                className='hidden'
                                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                            />
                        </label>
                        {previews.length > 0 && (
                            <div className='mt-2 grid grid-cols-4 gap-2'>
                                {previews.map((url, i) => (
                                    <div key={url} className='relative aspect-square'>
                                        <img
                                            src={url}
                                            alt={files[i]?.name}
                                            className='size-full rounded-md object-cover'
                                        />
                                        <button
                                            type='button'
                                            aria-label='Remove'
                                            onClick={() => setFiles((fs) => fs.filter((_, idx) => idx !== i))}
                                            className='bg-background/90 absolute -right-1.5 -top-1.5 rounded-full border p-0.5 shadow'
                                        >
                                            <X className='size-3' />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        onClick={submit}
                        disabled={create.isPending || (!description.trim() && files.length === 0)}
                        className='cursor-pointer'
                    >
                        {create.isPending ? 'Saving…' : 'Save report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const ReportCard = ({ report }: { report: FloodEventReport }) => (
    <Card size='sm' className='gap-2'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
            <span className='flex items-center gap-1.5 text-sm font-medium'>
                <User className='text-muted-foreground size-3.5' />
                {report.reporter_name ?? 'Unknown reporter'}
            </span>
            <span className='text-muted-foreground text-xs'>
                {format(new Date(report.occurred_at), 'LLL d, y · HH:mm')}
            </span>
        </div>
        {report.description && <p className='text-sm'>{report.description}</p>}
        {report.images.length > 0 && (
            <div className='grid grid-cols-3 gap-2 sm:grid-cols-4'>
                {report.images.map((img) => (
                    <a
                        key={img.id}
                        href={img.image}
                        target='_blank'
                        rel='noreferrer'
                        className='aspect-square overflow-hidden rounded-md border'
                    >
                        <img
                            src={img.image}
                            alt={img.caption || 'Evidence'}
                            className='size-full object-cover transition-transform hover:scale-105'
                        />
                    </a>
                ))}
            </div>
        )}
    </Card>
)

const EvidenceReports = ({ eventId }: { eventId: number }) => {
    const { isOperator } = useAuth()
    const { data, isLoading } = useFloodReports(eventId)
    const reports = data?.results ?? []

    return (
        <Card className='mt-2'>
            <CardTitle className='flex flex-row items-center justify-between'>
                <span className='flex items-center gap-2'>
                    <Camera className='size-4' />
                    Evidence Reports
                    {reports.length > 0 && (
                        <span className='text-muted-foreground text-sm font-normal'>
                            {reports.length}
                        </span>
                    )}
                </span>
                {isOperator && <AddReportDialog eventId={eventId} />}
            </CardTitle>
            <Separator />
            <CardContent className='flex flex-col gap-2 px-0'>
                {isLoading ? (
                    <p className='text-muted-foreground text-sm'>Loading…</p>
                ) : reports.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>
                        No evidence reported yet.
                        {isOperator ? ' Add photos and a description as supporting evidence.' : ''}
                    </p>
                ) : (
                    reports.map((report) => <ReportCard key={report.id} report={report} />)
                )}
            </CardContent>
        </Card>
    )
}

export default EvidenceReports
