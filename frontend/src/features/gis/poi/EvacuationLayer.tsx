import type { Feature, Point } from 'geojson'
import { Tent } from 'lucide-react'
import { MapMarker, MarkerContent, MarkerPopup } from '@/common/ui/map'
import { Badge } from '@/common/ui/badge'
import { useEvacuationCenters } from './usePoi'
import type { EvacuationProperties } from './types'

interface Props {
    /** Layer toggle. When off, only centers inside the focused barangay show. */
    visible: boolean
    focusedBarangayId: number | null
}

const Pin = ({ tone }: { tone: 'active' | 'inactive' }) => {
    const color = tone === 'inactive' ? 'bg-slate-400' : 'bg-emerald-600'
    return (
        <div
            className={`flex size-7 items-center justify-center rounded-full border-2 border-white shadow-lg ${color}`}
        >
            <Tent className='size-4 text-white' />
        </div>
    )
}

const ReadOnlyDetails = ({ p }: { p: EvacuationProperties }) => (
    <div className='flex w-48 flex-col gap-1'>
        <div className='flex items-center justify-between gap-2'>
            <span className='font-medium'>{p.name}</span>
            {!p.is_active && <Badge variant='secondary'>Inactive</Badge>}
        </div>
        {p.barangay_name && <span className='text-muted-foreground text-xs'>{p.barangay_name}</span>}
        <div className='text-xs'>
            {p.capacity != null && <div>Capacity: {p.capacity.toLocaleString()}</div>}
            {p.contact && <div>Contact: {p.contact}</div>}
        </div>
    </div>
)

type EvacFeature = Feature<Point, EvacuationProperties>

/** Read-only evacuation-center markers. Centers are managed from the admin
 * console (Admin → Evacuation centers), not on the map. */
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
                        <MarkerPopup closeButton>
                            <ReadOnlyDetails p={p} />
                        </MarkerPopup>
                    </MapMarker>
                )
            })}
        </>
    )
}

export default EvacuationLayer
