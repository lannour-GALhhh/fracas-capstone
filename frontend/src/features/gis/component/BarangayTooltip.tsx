import { AlertTriangle, Tent, Users } from 'lucide-react'
import { MapPopup } from '@/common/ui/map'
import { Badge } from '@/common/ui/badge'
import { CATEGORY_LABELS, RISK_COLORS } from '../constants/risk'
import { useEvacuationCenters } from '../poi/usePoi'
import type { EvacuationProperties } from '../poi/types'
import type { BarangayRiskProperties, RiskFeatureCollection } from '../types/api'

interface Props {
    /** Joined geometry + risk collection to read the barangay's properties from. */
    data: RiskFeatureCollection
    /** Barangay to describe. */
    id: number
    /** Where to anchor the popup ([lng, lat]). */
    lngLat: [number, number]
    /** Pinned popups stay put and show a close button; hover popups don't. */
    pinned?: boolean
    onClose?: () => void
}

const propsById = (
    data: RiskFeatureCollection,
    id: number,
): BarangayRiskProperties | null =>
    data.features.find((f) => f.properties.id === id)?.properties ?? null

const HazardBadge = ({ category }: { category: BarangayRiskProperties['category'] }) => {
    if (!category) return <Badge variant='secondary'>No data</Badge>

    const textColor: string = category === "low" ? '#3f0a0a' : '#ffffff';

    return (
        <Badge style={{ backgroundColor: RISK_COLORS[category], color: textColor }}>
            {CATEGORY_LABELS[category]}
        </Badge>
    )
}

const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className='flex flex-col'>
        <span className='text-muted-foreground text-[10px] uppercase tracking-wide'>{label}</span>
        <span className='text-sm font-semibold'>{value}</span>
    </div>
)

const SectionHeader = ({
    icon: Icon,
    label,
    count,
}: {
    icon: typeof Tent
    label: string
    count: number
}) => (
    <span className='text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide'>
        <Icon className='size-3' />
        {label} ({count})
    </span>
)

/** The barangay's evacuation centers, at a glance. */
const PoiSummary = ({ id }: { id: number }) => {
    const { data: evacData } = useEvacuationCenters()

    const centers = ((evacData?.features ?? []) as { properties: EvacuationProperties }[]).filter(
        (f) => f.properties.barangay === id,
    )

    if (centers.length === 0) return null

    return (
        <div className='flex flex-col gap-1 border-t pt-2'>
            <SectionHeader icon={Tent} label='Evacuation centers' count={centers.length} />
            {centers.map(({ properties: p }) => (
                <div key={p.id} className='flex items-center justify-between gap-2 text-xs'>
                    <span className='truncate'>{p.name}</span>
                    {p.capacity != null && (
                        <span className='text-muted-foreground shrink-0'>
                            {p.capacity.toLocaleString()} cap
                        </span>
                    )}
                </div>
            ))}
        </div>
    )
}

/**
 * A byte-sized readout anchored to a barangay: name, hazard badge, subscribed
 * residents, and a couple of at-a-glance stats. Rendered on hover, and pinned
 * (kept anchored, with a close button) when the barangay is selected.
 */
const BarangayTooltip = ({ data, id, lngLat, pinned = false, onClose }: Props) => {
    const p = propsById(data, id)
    if (!p) return null

    return (
        <MapPopup
            longitude={lngLat[0]}
            latitude={lngLat[1]}
            closeButton={pinned}
            onClose={onClose}
            closeOnClick={false}
            className='w-56 -translate-x-60'
        >
            <div className='flex flex-col gap-2'>
                <div className='flex items-start justify-between gap-2 pr-4'>
                    <h4 className='text-sm leading-tight font-semibold'>{p.name}</h4>
                    <HazardBadge category={p.category} />
                </div>

                <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                    <Users className='size-3.5' />
                    <span>
                        <span className='text-foreground font-semibold'>
                            {p?.subscriber_count?.toLocaleString() || 0}
                        </span>{' '}
                        users registered
                    </span>
                </div>

                <div className='flex flex-col gap-2 border-t pt-2'>
                    <Stat label='Area' value={`${p.area_square_km} km²`} />
                </div>

                <PoiSummary id={id} />

                {p.is_degraded && (
                    <div className='text-destructive flex items-center gap-1 text-[11px] font-medium'>
                        <AlertTriangle className='size-3' />
                        Score degraded — inputs were stale
                    </div>
                )}
            </div>
        </MapPopup>
    )
}

export default BarangayTooltip
