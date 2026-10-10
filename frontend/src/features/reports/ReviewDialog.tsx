import { useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { CalendarDays, Check, Clock, MapPin, MessageSquare, Save, User, X, type LucideIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/common/ui/dialog'
import { Button } from '@/common/ui/button'
import { Label } from '@/common/ui/label'
import { Textarea } from '@/common/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/ui/select'
import ImageLightbox from '@/common/components/ImageLightbox'
import { cn } from '@/common/utils/utils'
import { useFloodEvents } from '@/features/history/hooks/useFloodEvents'
import { STATUS_META } from './constants'
import { useReviewReport } from './hooks'
import type { FloodReport } from './types'

const NONE = 'none'

const Detail = ({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) => (
    <div className='flex items-start gap-3'>
        <span className='bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md'>
            <Icon className='size-4' />
        </span>
        <div className='min-w-0'>
            <p className='text-muted-foreground text-xs'>{label}</p>
            <p className='text-sm font-medium'>{children}</p>
        </div>
    </div>
)

/** Verify (and link to a flood event) or reject one resident report. */
const ReviewDialog = ({ report, onClose }: { report: FloodReport; onClose: () => void }) => {
    const [eventId, setEventId] = useState(report.flood_event ? String(report.flood_event) : NONE)
    const [note, setNote] = useState(report.review_note)
    const [active, setActive] = useState(0)
    const [zoomed, setZoomed] = useState<number | null>(null)
    const review = useReviewReport()
    const { data: events } = useFloodEvents({ barangay: report.barangay ?? undefined }, report.barangay != null)

    const options = (events?.results ?? []).map((e) => ({
        id: String(e.id),
        label: `${format(new Date(e.occurred_at), 'LLL d, y')} · ${e.barangay_name} · #${e.id}`,
    }))
    const labelFor = (value: string | null) =>
        !value || value === NONE ? 'Not linked' : (options.find((o) => o.id === value)?.label ?? 'Loading…')

    const submit = (status: 'verified' | 'rejected') =>
        review.mutate(
            {
                id: report.id,
                status,
                review_note: note,
                flood_event: eventId === NONE ? null : Number(eventId),
            },
            { onSuccess: onClose },
        )

    const sent = new Date(report.created_at)
    const images = report.images
    const { label: statusLabel, icon: StatusIcon, tag } = STATUS_META[report.status]

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className='grid-cols-1 gap-0 overflow-hidden p-0 sm:max-w-5xl md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
                {/* Photos */}
                <div className='bg-black/90 flex min-h-80 flex-col md:h-[36rem]'>
                    <button
                        type='button'
                        onClick={() => setZoomed(active)}
                        className='flex min-h-0 flex-1 cursor-zoom-in items-center justify-center'
                    >
                        {images[active] && (
                            <img src={images[active].image} alt='Flood report' className='size-full object-contain' />
                        )}
                    </button>
                    {images.length > 1 && (
                        <div className='flex gap-2 overflow-x-auto p-2'>
                            {images.map((img, i) => (
                                <button
                                    key={img.id}
                                    type='button'
                                    onClick={() => setActive(i)}
                                    className={cn(
                                        'size-14 shrink-0 cursor-pointer overflow-hidden rounded-md border-2',
                                        i === active ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100',
                                    )}
                                >
                                    <img src={img.image} alt='' className='size-full object-cover' />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className='flex min-h-0 flex-col gap-4 overflow-y-auto p-5 md:h-[36rem]'>
                    <div className='flex items-center pr-8'>
                        <DialogTitle className='sr-only'>Report details</DialogTitle>
                        <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tag)}>
                            <StatusIcon className='size-3' />
                            {statusLabel}
                        </span>
                    </div>
                    <DialogDescription className='sr-only'>Review this resident flood report.</DialogDescription>

                    <div className='grid grid-cols-2 gap-x-4 gap-y-3'>
                        <Detail icon={MapPin} label='Barangay'>
                            {report.barangay_name ?? 'Unknown'}
                        </Detail>
                        <Detail icon={User} label='Sender'>
                            {report.reporter_name ?? 'Unknown'}
                        </Detail>
                        <Detail icon={CalendarDays} label='Date'>
                            {format(sent, 'LLL d, y')}
                        </Detail>
                        <Detail icon={Clock} label='Time'>
                            {format(sent, 'h:mm a')}
                        </Detail>
                    </div>

                    {report.latitude != null && report.longitude != null && (
                        <a
                            href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=17/${report.latitude}/${report.longitude}`}
                            target='_blank'
                            rel='noreferrer'
                            className='text-muted-foreground -mt-1 text-xs underline'
                        >
                            View pinned location ({report.latitude.toFixed(5)}, {report.longitude.toFixed(5)})
                        </a>
                    )}

                    {/* Long comments scroll in their own box instead of stretching the panel. */}
                    <div className='flex min-h-24 flex-1 flex-col gap-1.5 overflow-hidden'>
                        <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                            <MessageSquare className='size-3.5' />
                            Comment
                        </p>
                        <div className='bg-muted/50 min-h-0 flex-1 overflow-y-auto rounded-md border p-3 text-sm break-words whitespace-pre-wrap'>
                            {report.description || <span className='text-muted-foreground'>No comment provided.</span>}
                        </div>
                    </div>

                    <div className='flex flex-col gap-1'>
                        <Label>Flood event</Label>
                        <Select value={eventId} onValueChange={(v) => setEventId(v ?? NONE)}>
                            <SelectTrigger className='w-full'>
                                <SelectValue>{labelFor}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>Not linked</SelectItem>
                                {options.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className='flex flex-col gap-1'>
                        <Label>Review note (optional)</Label>
                        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={255} />
                    </div>

                    <div className='flex justify-end gap-2 pt-1'>
                        {report.status === 'verified' ? (
                            <>
                                <Button variant='outline' onClick={onClose} className='cursor-pointer'>
                                    <X className='size-4' />
                                    Close
                                </Button>
                                <Button disabled={review.isPending || eventId === NONE} onClick={() => submit('verified')} className='cursor-pointer'>
                                    <Save className='size-4' />
                                    Save
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant='outline' disabled={review.isPending} onClick={() => submit('rejected')} className='cursor-pointer'>
                                    <X className='size-4' />
                                    Reject
                                </Button>
                                <Button disabled={review.isPending || eventId === NONE} onClick={() => submit('verified')} className='cursor-pointer'>
                                    <Check className='size-4' />
                                    Verify
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                <ImageLightbox images={images.map((i) => i.image)} index={zoomed} onIndexChange={setZoomed} />
            </DialogContent>
        </Dialog>
    )
}

export default ReviewDialog
