import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { MapMarker, MarkerContent, MarkerPopup } from '@/common/ui/map'
import { featureBoundsById } from '@/features/gis/utils/bounds'
import type { RiskFeatureCollection } from '@/features/gis/types/api'
import { useActiveEvacuations } from '../hooks/useActiveEvacuations'
import { TRIGGER_LABELS } from '../constants/evacuation'
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

/** The pulsing badge: evacuated / total, ringed by an animated pulse. */
const PingBadge = ({ safe, roster }: { safe: number; roster: number }) => (
    <div className='relative flex items-center justify-center'>
        <span className='bg-destructive/40 absolute inline-flex h-full w-full animate-ping rounded-full' />
        <span className='bg-destructive relative inline-flex items-center gap-1 rounded-full border-2 border-white px-2 py-0.5 text-xs font-semibold text-white shadow-lg tabular-nums'>
            {safe}/{roster}
        </span>
    </div>
)

/** A labelled row in the "Under evacuation" card. */
const Row = ({ label, value }: { label: string; value: string | number }) => (
    <div className='flex items-center justify-between gap-4'>
        <span className='text-muted-foreground'>{label}</span>
        <span className='font-medium tabular-nums'>{value}</span>
    </div>
)

/** The click-through card anchored to a badge. */
const UnderEvacuationCard = ({ evac }: { evac: EvacuationAggregate }) => {
    const navigate = useNavigate()
    const remaining = Math.max(evac.roster - evac.safe, 0)

    return (
        <div className='flex w-52 flex-col gap-1.5 text-xs'>
            <div className='flex flex-col'>
                <span className='text-destructive text-[11px] font-semibold uppercase tracking-wide'>
                    Under evacuation
                </span>
                <span className='text-sm font-semibold'>{evac.barangay.name}</span>
            </div>
            <Row
                label={TRIGGER_LABELS[evac.trigger]}
                value={formatDistanceToNow(new Date(evac.opened_at), { addSuffix: true })}
            />
            <div className='border-t pt-1.5' />
            <Row label='Evacuated' value={evac.safe} />
            <Row label='Remaining' value={remaining} />
            <Row label='Total residents' value={evac.roster} />
            <button
                type='button'
                onClick={() => navigate('/evacuation')}
                className='text-destructive mt-1 self-start font-medium hover:underline'
            >
                View evacuation →
            </button>
        </div>
    )
}

/**
 * Overlays a pulsing evacuated/total badge on every barangay under an active
 * evacuation, anchored at its centroid. Clicking opens the "Under evacuation"
 * card. Reads the same shared aggregate as the /evacuation page.
 */
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
                        <MarkerPopup closeButton>
                            <UnderEvacuationCard evac={evac} />
                        </MarkerPopup>
                    </MapMarker>
                )
            })}
        </>
    )
}

export default EvacuationPingLayer
