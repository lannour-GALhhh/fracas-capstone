import { Check, Siren, X } from 'lucide-react'
import { Button } from '@/common/ui/button'

interface Props {
    active: boolean
    selectedCount: number
    onStart: () => void
    onProceed: () => void
    onCancel: () => void
}

const MassEvacuationControls = ({ active, selectedCount, onStart, onProceed, onCancel }: Props) =>
    active ? (
        <div className='flex gap-2'>
            <Button
                className='h-9 cursor-pointer rounded-full bg-red-600 text-white shadow-md hover:bg-red-700'
                onClick={() => selectedCount > 0 && onProceed()}
            >
                <Check className='size-4' />
                Proceed with Evacuation{selectedCount > 0 && ` (${selectedCount})`}
            </Button>
            <Button
                variant='outline'
                className='bg-background h-9 cursor-pointer rounded-full shadow-md'
                onClick={onCancel}
            >
                <X className='size-4' />
                Cancel Action
            </Button>
        </div>
    ) : (
        <Button
            variant='ghost'
            className='bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 h-9 cursor-pointer rounded-full shadow-md'
            onClick={onStart}
        >
            <Siren className='size-4' />
            Mass Evacuation
        </Button>
    )

export default MassEvacuationControls
