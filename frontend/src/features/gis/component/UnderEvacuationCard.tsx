import { Crosshair, Siren } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import { useActiveEvacuations } from '@/features/evacuation/hooks/useActiveEvacuations'
import { useRadiusEvacuations } from '@/features/evacuation/hooks/useRadiusEvacuations'

/** Danger-toned summary of ongoing evacuations, linking to the evacuations page. */
const UnderEvacuationCard = ({ onSelect }: { onSelect: (id: number) => void }) => {
    const navigate = useNavigate()
    const { data: zoneEvacs } = useActiveEvacuations()
    const { data: pointEvacs } = useRadiusEvacuations()
    const data = zoneEvacs ?? []
    const points = pointEvacs ?? []
    const total = data.length + points.length

    if (total === 0) return null

    return (
        <Card
            size='sm'
            className='absolute right-4 bottom-4 z-2 w-1/4 min-w-72 gap-2.5 border-red-200 bg-red-50 px-4 py-4 text-red-900'
        >
            <div className='flex items-center gap-2 text-base font-semibold text-red-700'>
                <Siren className='size-5' />
                Under Evacuation
                <span className='ml-auto rounded-full bg-red-600 px-2.5 py-0.5 text-sm text-white'>
                    {total}
                </span>
            </div>
            <div className='flex flex-wrap gap-1.5'>
                {data.map((e) => (
                    <button
                        key={e.evacuation_id}
                        type='button'
                        onClick={() => onSelect(e.barangay.id)}
                        className='cursor-pointer rounded-full border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-100'
                    >
                        {e.barangay.name}
                    </button>
                ))}
            </div>
            {points.map((p) => (
                <div key={p.id} className='flex flex-col gap-1.5 rounded-lg border border-red-200 bg-white/60 p-2.5'>
                    <div className='flex items-center gap-1.5 text-sm font-semibold text-red-800'>
                        <Crosshair className='size-4' />
                        Point evacuation · {p.radius_m.toLocaleString()} m
                    </div>
                    <span className='font-mono text-xs text-red-900/70 tabular-nums'>
                        {p.center.lat.toFixed(5)}°, {p.center.lng.toFixed(5)}°
                    </span>
                    <div className='flex flex-wrap gap-1'>
                        {p.barangays.length ? (
                            p.barangays.map((b) => (
                                <button
                                    key={b.id}
                                    type='button'
                                    onClick={() => onSelect(b.id)}
                                    className='cursor-pointer rounded-full border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-100'
                                >
                                    {b.name}
                                </button>
                            ))
                        ) : (
                            <span className='text-xs text-red-900/70'>Outside mapped barangays</span>
                        )}
                    </div>
                </div>
            ))}
            <Button
                size='default'
                className='w-full cursor-pointer bg-red-600 text-sm text-white hover:bg-red-700'
                onClick={() => navigate('/evacuation')}
            >
                View evacuations
            </Button>
        </Card>
    )
}

export default UnderEvacuationCard
