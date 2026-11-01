import { Crosshair, MapPin, Siren, X } from 'lucide-react'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import { Input } from '@/common/ui/input'
import { useDeclareRadiusEvacuation } from '../hooks/useRadiusEvacuations'
import { MAX_RADIUS_M, MIN_RADIUS_M } from '../types/radius'

interface Props {
    /** Placed centre, or null until the operator clicks the map. */
    point: { lng: number; lat: number } | null
    radiusM: number
    /** Barangays the circle currently touches (live preview). */
    barangays: { id: number; name: string }[]
    onRadiusChange: (m: number) => void
    onCancel: () => void
    onDone: () => void
}

const Coord = ({ label, value }: { label: string; value: number }) => (
    <div className='bg-muted/50 flex flex-1 flex-col rounded-lg px-2.5 py-1.5'>
        <span className='text-muted-foreground text-[11px]'>{label}</span>
        <span className='font-mono text-sm font-medium tabular-nums'>{value.toFixed(5)}°</span>
    </div>
)

/** Floating form for a point evacuation: place on the map, size it, declare. */
const RadiusEvacuationPanel = ({
    point,
    radiusM,
    barangays,
    onRadiusChange,
    onCancel,
    onDone,
}: Props) => {
    const declare = useDeclareRadiusEvacuation()
    const valid = radiusM >= MIN_RADIUS_M && radiusM <= MAX_RADIUS_M

    return (
        <Card className='w-80 gap-3 p-4 shadow-lg'>
            <div className='flex items-center justify-between'>
                <h3 className='flex items-center gap-2 text-sm font-semibold'>
                    <Crosshair className='size-4 text-red-600' />
                    Point evacuation
                </h3>
                <Button variant='ghost' size='icon-sm' aria-label='Cancel' onClick={onCancel}>
                    <X className='size-4' />
                </Button>
            </div>

            <div className='flex flex-col gap-1.5'>
                <span className='flex items-center gap-1.5 text-xs font-medium'>
                    <MapPin className='size-3.5' /> Centre
                </span>
                {point ? (
                    <div className='flex gap-2'>
                        <Coord label='Latitude' value={point.lat} />
                        <Coord label='Longitude' value={point.lng} />
                    </div>
                ) : (
                    <p className='text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-2 text-xs'>
                        Click the map to place the centre.
                    </p>
                )}
            </div>

            <label className='flex flex-col gap-1 text-xs font-medium'>
                Radius (metres)
                <div className='flex items-center gap-2'>
                    <input
                        type='range'
                        className='flex-1 accent-red-600'
                        min={MIN_RADIUS_M}
                        max={3000}
                        step={50}
                        value={Math.min(radiusM, 3000)}
                        onChange={(e) => onRadiusChange(Number(e.target.value))}
                    />
                    <Input
                        type='number'
                        className='w-24'
                        min={MIN_RADIUS_M}
                        max={MAX_RADIUS_M}
                        value={radiusM}
                        onChange={(e) => onRadiusChange(Number(e.target.value))}
                    />
                </div>
            </label>

            {point && (
                <div className='flex flex-col gap-1.5'>
                    <span className='text-xs font-medium'>
                        Affected barangays ({barangays.length})
                    </span>
                    {barangays.length ? (
                        <div className='flex max-h-24 flex-wrap gap-1 overflow-y-auto'>
                            {barangays.map((b) => (
                                <Badge key={b.id} variant='secondary'>
                                    {b.name}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className='text-muted-foreground text-xs'>
                            Outside every mapped barangay.
                        </p>
                    )}
                </div>
            )}

            <Button
                variant='destructive'
                className='cursor-pointer'
                disabled={!point || !valid || declare.isPending}
                onClick={() =>
                    point &&
                    declare.mutate(
                        { lat: point.lat, lng: point.lng, radius_m: radiusM },
                        { onSuccess: onDone },
                    )
                }
            >
                <Siren className='size-4' />
                {declare.isPending ? 'Declaring…' : 'Declare evacuation'}
            </Button>
        </Card>
    )
}

export default RadiusEvacuationPanel
