import { Siren } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import { useActiveEvacuations } from '@/features/evacuation/hooks/useActiveEvacuations'

/** Danger-toned summary of ongoing evacuations, linking to the evacuations page. */
const UnderEvacuationCard = () => {
    const navigate = useNavigate()
    const { data } = useActiveEvacuations()

    if (!data || data.length === 0) return null

    const names = data.map((e) => e.barangay.name)
    const shown = names.slice(0, 3).join(', ')
    const extra = names.length > 3 ? ` +${names.length - 3} more` : ''

    return (
        <Card
            size='sm'
            className='absolute right-4 bottom-4 z-2 w-1/4 min-w-64 gap-2 border-red-200 bg-red-50 px-3 py-3 text-red-900'
        >
            <div className='flex items-center gap-2 font-semibold text-red-700'>
                <Siren className='size-4' />
                Under Evacuation
                <span className='ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs text-white'>
                    {data.length}
                </span>
            </div>
            <p className='truncate text-xs text-red-800'>
                {shown}
                {extra}
            </p>
            <Button
                size='sm'
                className='w-full cursor-pointer bg-red-600 text-white hover:bg-red-700'
                onClick={() => navigate('/evacuation')}
            >
                View evacuations
            </Button>
        </Card>
    )
}

export default UnderEvacuationCard
