import { useState } from 'react'
import { AlertTriangle, ArrowLeft, Siren } from 'lucide-react'
import { Button } from '@/common/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/common/ui/dialog'
import { useZoneRisk } from '@/features/gis/hooks/useZoneRisk'
import type { RiskCategory, SusceptibilityLevel } from '@/features/gis/types/api'
import { useMassEvacuation } from '../hooks/useMassEvacuation'
import { zoneRows } from '../utils/zones'
import ZonePicker from './ZonePicker'

export interface MassEvacuationTarget {
    id: number
    name: string
    score: number | null
    category: RiskCategory | null
}

interface Props {
    open: boolean
    targets: MassEvacuationTarget[]
    onOpenChange: (open: boolean) => void
    onDone: () => void
}

/** Same zone selection as the single ping, repeated per selected barangay. */
const MassEvacuationDialog = ({ open, targets, onOpenChange, onDone }: Props) => {
    const mass = useMassEvacuation()
    const { data: lookup } = useZoneRisk()
    // Per barangay; absent = untouched, so default to its High/Critical zones.
    const [picked, setPicked] = useState<Record<number, SusceptibilityLevel[]>>({})

    const items = targets.map((t) => {
        const rows = zoneRows(t.id, lookup)
        const selected = picked[t.id] ?? rows.filter((r) => r.qualifies).map((r) => r.level)
        return { target: t, rows, selected }
    })

    const handleOpenChange = (next: boolean) => {
        if (next) {
            mass.reset()
            setPicked({})
        }
        onOpenChange(next)
    }

    const handleProceed = () =>
        mass.mutate(
            items.map((i) => ({ barangayId: i.target.id, zones: i.selected })),
            { onSuccess: onDone },
        )

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='text-destructive flex items-center gap-2'>
                        <AlertTriangle className='size-4' />
                        Declare evacuation — {targets.length} barangays?
                    </DialogTitle>
                </DialogHeader>

                <div className='flex max-h-96 flex-col gap-4 overflow-y-auto'>
                    {items.map(({ target, rows, selected }) => (
                        <div key={target.id} className='flex flex-col gap-1.5'>
                            <h3 className='text-sm font-semibold'>{target.name}</h3>
                            <ZonePicker
                                rows={rows}
                                selected={selected}
                                onChange={(levels) =>
                                    setPicked((p) => ({ ...p, [target.id]: levels }))
                                }
                            />
                        </div>
                    ))}
                </div>

                {mass.isError && (
                    <p className='text-destructive text-sm'>Couldn&apos;t declare them. Please try again.</p>
                )}

                <DialogFooter>
                    <Button
                        type='button'
                        variant='outline'
                        disabled={mass.isPending}
                        onClick={() => onOpenChange(false)}
                    >
                        <ArrowLeft className='size-4' />
                        Cancel
                    </Button>
                    <Button
                        type='button'
                        variant='destructive'
                        className='cursor-pointer'
                        disabled={mass.isPending || items.some((i) => i.selected.length === 0)}
                        onClick={handleProceed}
                    >
                        <Siren className='size-4' />
                        {mass.isPending ? 'Declaring…' : 'Declare evacuation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default MassEvacuationDialog
