import { useState } from 'react'
import { AlertTriangle, Siren } from 'lucide-react'
import { Button } from '@/common/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/common/ui/dialog'
import { useZoneRisk } from '@/features/gis/hooks/useZoneRisk'
import type { SusceptibilityLevel } from '@/features/gis/types/api'
import { usePingEvacuation } from '../hooks/usePingEvacuation'
import { zoneRows } from '../utils/zones'
import ZonePicker from './ZonePicker'

interface PingEvacuationDialogProps {
    barangayId: number
    barangayName: string
    triggerClassName?: string
}

/** Destructive "Ping Evacuation" action, gated behind a confirm. */
const PingEvacuationDialog = ({
    barangayId,
    barangayName,
    triggerClassName,
}: PingEvacuationDialogProps) => {
    const [open, setOpen] = useState(false)
    const ping = usePingEvacuation()
    const { data: lookup } = useZoneRisk()
    const rows = zoneRows(barangayId, lookup)
    // null = untouched: default to every High/Critical zone.
    const [picked, setPicked] = useState<SusceptibilityLevel[] | null>(null)
    const selected = picked ?? rows.filter((r) => r.qualifies).map((r) => r.level)

    const onOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) {
            ping.reset()
            setPicked(null)
        }
    }

    const handleConfirm = () => {
        ping.mutate({ barangayId, zones: selected }, { onSuccess: () => setOpen(false) })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger
                render={
                    <Button size='sm' variant='destructive' className={triggerClassName}>
                        <Siren className='size-4' />
                        Ping Evacuation
                    </Button>
                }
            />
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='text-destructive flex items-center gap-2'>
                        <AlertTriangle className='size-4' />
                        Declare evacuation — {barangayName}?
                    </DialogTitle>
                </DialogHeader>

                <ZonePicker rows={rows} selected={selected} onChange={setPicked} />

                {ping.isError && (
                    <p className='text-destructive text-sm'>Couldn&apos;t declare it. Please try again.</p>
                )}

                <DialogFooter>
                    <DialogClose render={<Button type='button' variant='outline'>Cancel</Button>} />
                    <Button
                        type='button'
                        variant='destructive'
                        className='cursor-pointer'
                        disabled={ping.isPending || selected.length === 0}
                        onClick={handleConfirm}
                    >
                        <Siren className='size-4' />
                        {ping.isPending ? 'Declaring…' : 'Declare evacuation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default PingEvacuationDialog
