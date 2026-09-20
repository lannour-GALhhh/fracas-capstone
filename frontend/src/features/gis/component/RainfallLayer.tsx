import { MapMarker, MarkerContent, MarkerPopup } from '@/common/ui/map'
import { geometryBounds } from '../utils/bounds'
import type { RiskFeatureCollection } from '../types/api'
import { RAINFALL_TIER_LABELS, rainfallTier } from '../constants/rainfall'
import RainfallIcon from './RainfallIcon'

interface Props {
    data: RiskFeatureCollection | null
    visible: boolean
}

/** Centre of a feature's bounding box. */
const centroidOf = (
    feature: RiskFeatureCollection['features'][number],
): [number, number] | null => {
    const box = geometryBounds(feature.geometry)
    return box ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : null
}

/** Overlays a rainfall-intensity badge on every barangay currently getting rain. */
const RainfallLayer = ({ data, visible }: Props) => {
    if (!data || !visible) return null

    return (
        <>
            {data.features.map((feature) => {
                const mmPerHour = feature.properties.current_rainfall
                const tier = rainfallTier(mmPerHour)
                if (tier === 'none') return null

                const centroid = centroidOf(feature)
                if (!centroid) return null
                const [lng, lat] = centroid

                return (
                    <MapMarker
                        key={feature.properties.id}
                        longitude={lng}
                        latitude={lat}
                        draggable={false}
                    >
                        <MarkerContent>
                            <RainfallIcon mmPerHour={mmPerHour} />
                        </MarkerContent>
                        <MarkerPopup closeButton>
                            <div className='flex w-40 flex-col gap-0.5 text-xs'>
                                <span className='text-sm font-semibold'>{feature.properties.name}</span>
                                <span className='text-muted-foreground'>
                                    {RAINFALL_TIER_LABELS[tier]} · {mmPerHour} mm/hr
                                </span>
                            </div>
                        </MarkerPopup>
                    </MapMarker>
                )
            })}
        </>
    )
}

export default RainfallLayer
