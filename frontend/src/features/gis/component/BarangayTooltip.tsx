import { MapPopup } from '@/common/ui/map'
import { Badge } from '@/common/ui/badge'
import { CATEGORY_LABELS, RISK_COLORS } from '../constants/risk'
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

/** A small readout anchored to a barangay: name and hazard level. */
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
            <div className='flex items-start justify-between gap-2 pr-4'>
                <h4 className='text-sm leading-tight font-semibold'>{p.name}</h4>
                <HazardBadge category={p.category} />
            </div>
        </MapPopup>
    )
}

export default BarangayTooltip
