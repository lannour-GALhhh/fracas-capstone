import { formatDistanceToNow } from 'date-fns'
import { Crosshair, MapPin, ShieldCheck } from 'lucide-react'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import { useStandDownRadiusEvacuation } from '../hooks/useRadiusEvacuations'
import type { RadiusEvacuation } from '../types/radius'

/** One active point + radius evacuation: recorded geography, live tallies, stand-down. */
const RadiusEvacuationCard = ({ evac }: { evac: RadiusEvacuation }) => {
    const standDown = useStandDownRadiusEvacuation()
    return (
        <Card className='gap-3'>
            <div className='flex flex-wrap items-start justify-between gap-2'>
                <div className='flex flex-col gap-1'>
                    <div className='flex items-center gap-2'>
                        <Crosshair className='text-destructive size-4' />
                        <h2 className='text-lg font-semibold'>Point evacuation</h2>
                        <Badge variant='secondary'>Point-based</Badge>
                        <Badge variant='outline'>{evac.radius_m.toLocaleString()} m radius</Badge>
                    </div>
                    <div className='flex items-center gap-1.5 font-mono text-xs tabular-nums'>
                        <MapPin className='text-muted-foreground size-3.5' />
                        Centre {evac.center.lat.toFixed(5)}°, {evac.center.lng.toFixed(5)}°
                    </div>
                    <div className='flex flex-wrap gap-1'>
                        {evac.barangays.length ? (
                            evac.barangays.map((b) => (
                                <Badge key={b.id} variant='outline'>
                                    {b.name}
                                </Badge>
                            ))
                        ) : (
                            <span className='text-muted-foreground text-xs'>
                                Outside mapped barangays
                            </span>
                        )}
                    </div>
                    <span className='text-muted-foreground text-xs'>
                        Declared {formatDistanceToNow(new Date(evac.opened_at), { addSuffix: true })}
                    </span>
                </div>
                <Button
                    size='sm'
                    className='cursor-pointer'
                    disabled={standDown.isPending}
                    onClick={() => standDown.mutate(evac.id)}
                >
                    <ShieldCheck className='size-4' />
                    {standDown.isPending ? 'Standing down…' : 'Stand down'}
                </Button>
            </div>
            <div className='flex gap-6 text-sm'>
                <span>
                    <b className='tabular-nums'>{evac.inside ?? 0}</b>{' '}
                    <span className='text-muted-foreground'>still inside</span>
                </span>
                <span>
                    <b className='tabular-nums text-emerald-600'>{evac.safe ?? 0}</b>{' '}
                    <span className='text-muted-foreground'>evacuated</span>
                </span>
            </div>
        </Card>
    )
}

export default RadiusEvacuationCard
