import { Crosshair } from 'lucide-react'
import { Button } from '@/common/ui/button'

/** Starts point evacuation placement; sits beside Mass Evacuation. */
const RadiusEvacuationButton = ({ onClick }: { onClick: () => void }) => (
    <Button
        variant='ghost'
        className='h-9 cursor-pointer rounded-full bg-red-100 text-red-600 shadow-md hover:bg-red-200 hover:text-red-700'
        onClick={onClick}
    >
        <Crosshair className='size-4' />
        Point Evacuation
    </Button>
)

export default RadiusEvacuationButton
