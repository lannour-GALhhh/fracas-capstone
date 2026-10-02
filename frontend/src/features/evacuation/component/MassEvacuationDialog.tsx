import { AlertTriangle, ArrowLeft, Siren } from 'lucide-react'
import { Button } from '@/common/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/common/ui/dialog'
import { CATEGORY_LABELS, RISK_TEXT_COLORS } from '@/features/gis/constants/risk'
import type { RiskCategory } from '@/features/gis/types/api'
import { useMassEvacuation } from '../hooks/useMassEvacuation'

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

const MassEvacuationDialog = ({ open, targets, onOpenChange, onDone }: Props) => {
    const mass = useMassEvacuation()

    const handleProceed = () =>
        mass.mutate(
            targets.map((t) => t.id),
            { onSuccess: onDone },
        )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='text-destructive flex items-center gap-2'>
                        <AlertTriangle className='size-4' />
                        Declare Evacuation for these Barangays?
                    </DialogTitle>
                </DialogHeader>

                <div className='rounded-lg border'>
                    <div className='text-muted-foreground flex items-center justify-between border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide'>
                        <span>Barangay</span>
                        <span>Flood Risk</span>
                    </div>
                    <ul className='flex max-h-72 flex-col divide-y overflow-y-auto'>
                        {targets.map((t) => (
                        <li key={t.id} className='flex items-center justify-between px-3 py-2 text-sm'>
                            <span className='font-medium'>{t.name}</span>
                            <span
                                className='font-medium'
                                style={{ color: t.category ? RISK_TEXT_COLORS[t.category] : undefined }}
                            >
                                {t.category ? CATEGORY_LABELS[t.category] : 'No data'}
                            </span>
                        </li>
                    ))}
                    </ul>
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
                        Go back
                    </Button>
                    <Button
                        type='button'
                        variant='destructive'
                        className='cursor-pointer'
                        disabled={mass.isPending}
                        onClick={handleProceed}
                    >
                        <Siren className='size-4' />
                        {mass.isPending ? 'Declaring…' : 'Proceed with evacuation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default MassEvacuationDialog
