import { useState } from 'react'
import { format } from 'date-fns'
import { Ban, ShieldCheck } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/common/ui/dialog'
import { Skeleton } from '@/common/ui/skeleton'
import ErrorState from '@/common/components/ErrorState'
import ImageLightbox from '@/common/components/ImageLightbox'
import { useBlockedSenders, useUnblockSender } from './hooks'
import type { BlockedSender } from './types'

/** Anonymous list of blocked senders (photos + expiry only); operators can lift a block. */
const BlockedSendersDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    const { data, isLoading, isError, refetch } = useBlockedSenders(open)
    const unblock = useUnblockSender()
    const [confirming, setConfirming] = useState<BlockedSender | null>(null)
    const [zoom, setZoom] = useState<{ images: string[]; index: number } | null>(null)

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className='flex max-h-[85vh] flex-col gap-3 overflow-y-auto sm:max-w-2xl'>
                    <DialogTitle>Blocked accounts</DialogTitle>
                    <DialogDescription>
                        Senders currently blocked from reporting, shown by the photos they sent. No account details are shown.
                    </DialogDescription>

                    {isError ? (
                        <ErrorState message='We couldn’t load the blocked accounts.' onRetry={() => refetch()} />
                    ) : isLoading ? (
                        <Skeleton className='h-32' />
                    ) : !data?.length ? (
                        <p className='text-muted-foreground py-8 text-center text-sm'>No accounts are blocked.</p>
                    ) : (
                        <ul className='flex flex-col gap-3'>
                            {data.map((b) => (
                                <li key={b.id} className='flex flex-col gap-2 rounded-md border p-3'>
                                    <div className='flex items-center justify-between gap-3'>
                                        <span className='flex items-center gap-2 text-sm'>
                                            <Ban className='text-destructive size-4 shrink-0' />
                                            {b.permanent
                                                ? 'Blocked permanently'
                                                : `Blocked until ${format(new Date(b.until!), 'LLL d, y')}`}
                                        </span>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            className='cursor-pointer'
                                            onClick={() => setConfirming(b)}
                                        >
                                            <ShieldCheck className='size-4' />
                                            Unblock
                                        </Button>
                                    </div>
                                    {b.images.length === 0 ? (
                                        <p className='text-muted-foreground text-xs'>No photo on record.</p>
                                    ) : (
                                        <div className='flex flex-wrap gap-2'>
                                            {b.images.map((src, i) => (
                                                <button
                                                    key={src}
                                                    type='button'
                                                    className='size-20 cursor-pointer overflow-hidden rounded-md border'
                                                    onClick={() => setZoom({ images: b.images, index: i })}
                                                >
                                                    <img src={src} alt='Reported photo' loading='lazy' className='size-full object-cover' />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={confirming !== null} onOpenChange={(next) => !next && setConfirming(null)}>
                <DialogContent className='sm:max-w-sm'>
                    <DialogTitle>Unblock this user?</DialogTitle>
                    <DialogDescription>This will allow them to send reports again.</DialogDescription>
                    <DialogFooter>
                        <Button variant='outline' className='cursor-pointer' onClick={() => setConfirming(null)}>
                            Cancel
                        </Button>
                        <Button
                            className='cursor-pointer'
                            disabled={unblock.isPending}
                            onClick={() => confirming && unblock.mutate(confirming.id, { onSuccess: () => setConfirming(null) })}
                        >
                            Unblock
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ImageLightbox
                images={zoom?.images ?? []}
                index={zoom?.index ?? null}
                onIndexChange={(i) => setZoom((z) => (z && i !== null ? { ...z, index: i } : null))}
            />
        </>
    )
}

export default BlockedSendersDialog
