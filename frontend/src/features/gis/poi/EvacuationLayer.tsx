import type { Feature, Point } from 'geojson'
import type { ReactNode } from 'react'
import { Phone, Tent, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MapMarker, MarkerContent, MarkerPopup } from '@/common/ui/map'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import { useEvacuationCenters } from './usePoi'
import type { EvacuationProperties } from './types'

interface Props {
    /** Layer toggle. When off, only centers inside the focused barangay show. */
    visible: boolean
    focusedBarangayId: number | null
}

const Pin = ({ tone }: { tone: 'active' | 'inactive' }) => {
    const color = tone === 'inactive' ? 'bg-slate-400 opacity-60 grayscale' : 'bg-emerald-600'
    return (
        <div
            className={`flex size-7 items-center justify-center rounded-full border-2 border-white shadow-lg ${color}`}
        >
            <Tent className='size-4 text-white' />
        </div>
    )
}

const Row = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
    <div className='bg-muted/50 flex items-center justify-between gap-4 rounded-lg px-2.5 py-1.5'>
        <span className='text-muted-foreground flex items-center gap-2 text-[13px]'>
            {icon}
            {label}
        </span>
        <span className='min-w-0 truncate text-base font-medium tabular-nums'>{value}</span>
    </div>
)

const ReadOnlyDetails = ({ p }: { p: EvacuationProperties }) => {
    const navigate = useNavigate()
    return (
    <div className='flex w-80 flex-col gap-2.5 font-sans'>
        <div className='flex items-start justify-between gap-3'>
            <span className='text-[15px] font-semibold tracking-wide uppercase'>{p.name}</span>
            <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
                    p.is_active ? 'bg-emerald-600/10 text-emerald-600' : 'bg-slate-400/15 text-slate-500'
                }`}
                title={p.is_active ? 'Active' : 'Inactive'}
            >
                <Tent className='size-4' />
            </span>
        </div>
        {!p.is_active && (
            <Badge variant='secondary' className='w-fit'>
                Inactive
            </Badge>
        )}
        {(p.capacity != null || p.contacts.length > 0) && (
            <div className='flex flex-col gap-1'>
                {p.capacity != null && (
                    <Row
                        icon={<Users className='size-4' />}
                        label='Capacity'
                        value={`${p.capacity.toLocaleString()} ${p.capacity_unit}`.trim()}
                    />
                )}
                {p.contacts.map((c) => (
                    <Row
                        key={c.id}
                        icon={<Phone className='size-4' />}
                        label={c.label || 'Contact'}
                        value={c.phone}
                    />
                ))}
            </div>
        )}
        <Button
            size='sm'
            variant='outline'
            onClick={() => navigate(`/evacuation-centers?center=${p.id}`)}
        >
            View evacuation center
        </Button>
    </div>
    )
}

type EvacFeature = Feature<Point, EvacuationProperties>

/** Read-only evacuation-center markers; managed from the Evacuation Centers page, not the map. */
const EvacuationLayer = ({ visible, focusedBarangayId }: Props) => {
    const { data } = useEvacuationCenters()

    const features = (data?.features ?? []) as EvacFeature[]
    const shown = visible
        ? features
        : features.filter((f) => f.properties.barangay === focusedBarangayId)

    return (
        <>
            {shown.map((f) => {
                const [lng, lat] = f.geometry.coordinates
                const p = f.properties
                return (
                    <MapMarker key={p.id} longitude={lng} latitude={lat} draggable={false}>
                        <MarkerContent>
                            <Pin tone={p.is_active ? 'active' : 'inactive'} />
                        </MarkerContent>
                        <MarkerPopup className='max-w-none'>
                            <ReadOnlyDetails p={p} />
                        </MarkerPopup>
                    </MapMarker>
                )
            })}
        </>
    )
}

export default EvacuationLayer
