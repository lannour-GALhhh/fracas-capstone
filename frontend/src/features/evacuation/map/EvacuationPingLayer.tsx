import type { ReactNode } from 'react'
import { BellRing, CheckCircle2, CircleAlert, Siren, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/common/ui/button'
import { MapMarker, MarkerContent, MarkerPopup } from '@/common/ui/map'
import { featureBoundsById } from '@/features/gis/utils/bounds'
import type { RiskFeatureCollection } from '@/features/gis/types/api'
import { useActiveEvacuations } from '../hooks/useActiveEvacuations'
import { SEGMENT_COLORS } from '../constants/evacuation'
import { EvacuationPingBadge } from '../component/EvacuationPingIcon'
import type { EvacuationAggregate } from '../types/api'

interface Props {
    /** The risk feature collection — used to anchor each badge at a centroid. */
    data: RiskFeatureCollection | null
}

/** Centre of a barangay's bounding box, or null if it isn't in the collection. */
const centroidOf = (data: RiskFeatureCollection, id: number): [number, number] | null => {
    const box = featureBoundsById(data, id)
    return box ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : null
}

/** The pulsing siren badge, with evacuated/total pinned to its corner. */
const PingBadge = ({ safe, roster }: { safe: number; roster: number }) => (
    <div className='relative flex items-center justify-center'>
        <EvacuationPingBadge />
        <span className='bg-foreground absolute -right-1.5 -bottom-1.5 rounded-full border border-white px-1 text-[10px] font-semibold text-white shadow tabular-nums'>
            {safe}/{roster}
        </span>
    </div>
)

/** A stat row: tinted icon + muted label left, larger value right. */
const Row = ({
    icon,
    label,
    value,
    color,
}: {
    icon: ReactNode
    label: string
    value: number
    color?: string
}) => (
    <div className='bg-muted/50 flex items-center justify-between gap-6 rounded-lg px-2.5 py-1.5'>
        <span className='text-muted-foreground flex items-center gap-2 text-[13px]'>
            <span style={color ? { color } : undefined}>{icon}</span>
            {label}
        </span>
        <span className='text-base font-medium tabular-nums' style={color ? { color } : undefined}>
            {value.toLocaleString()}
        </span>
    </div>
)

/** The click-through card anchored to a badge. */
const UnderEvacuationCard = ({ evac }: { evac: EvacuationAggregate }) => {
    const navigate = useNavigate()

    return (
        // MapLibre mounts popups inside the map's canvas container, so pointer events
        // bubble into its drag/click handlers; keep them from swallowing the button press.
        <div
            className='flex w-72 flex-col gap-2.5 font-sans'
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            <div className='flex items-start justify-between gap-3'>
                <span className='text-[15px] font-semibold tracking-wide uppercase'>
                    {evac.barangay.name}
                </span>
                <span
                    className='bg-destructive/10 text-destructive flex size-7 shrink-0 items-center justify-center rounded-md'
                    title='Under evacuation'
                >
                    <Siren className='size-4' />
                </span>
            </div>

            <div className='flex flex-col gap-1'>
                <Row icon={<CheckCircle2 className='size-4' />} label='Evacuated' value={evac.safe} color={SEGMENT_COLORS.safe} />
                <Row icon={<CircleAlert className='size-4' />} label='Evacuated - Unsafe' value={evac.moving} color='#f59e0b' />
                <Row icon={<BellRing className='size-4' />} label='Alerted' value={evac.notified} />
                <Row icon={<Users className='size-4' />} label='Total Registered Users' value={evac.roster} />
            </div>

            <Button
                size='sm'
                className='w-full cursor-pointer bg-red-600 text-[13px] text-white hover:bg-red-700'
                onClick={() => navigate('/evacuation')}
            >
                View evacuation
            </Button>
        </div>
    )
}

/** Pulsing evacuated/total badge over every barangay under active evacuation. */
const EvacuationPingLayer = ({ data }: Props) => {
    const { data: evacuations } = useActiveEvacuations()

    if (!data || !evacuations?.length) return null

    return (
        <>
            {evacuations.map((evac) => {
                const centroid = centroidOf(data, evac.barangay.id)
                if (!centroid) return null
                const [lng, lat] = centroid
                return (
                    <MapMarker key={evac.evacuation_id} longitude={lng} latitude={lat} draggable={false}>
                        <MarkerContent>
                            <PingBadge safe={evac.safe} roster={evac.roster} />
                        </MarkerContent>
                        <MarkerPopup className='max-w-none'>
                            <UnderEvacuationCard evac={evac} />
                        </MarkerPopup>
                    </MapMarker>
                )
            })}
        </>
    )
}

export default EvacuationPingLayer
