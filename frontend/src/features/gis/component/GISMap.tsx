import { useState } from 'react'
import { History } from 'lucide-react'
import { Map, MapControls } from '@/common/ui/map'
import { Button } from '@/common/ui/button'
import { useAuth } from '@/features/auth/context/useAuth'
import type { RiskFeatureCollection } from '../types/api'
import { featureBoundsById } from '../utils/bounds'
import BarangayChoropleth from './BarangayChoropleth'
import BarangayTooltip from './BarangayTooltip'
import HazardZoneLayer from './HazardZoneLayer'
import EvacuationLayer from '../poi/EvacuationLayer'
import PoiLogDialog from '../poi/PoiLogDialog'
import LayersControl from './LayersControl'
import { type LayerKey, type LayerVisibility } from '../constants/layers'

interface GISMapProps {
    data: RiskFeatureCollection | null
    selectedId: number | null
    onSelect: (id: number | null) => void
    panelWidth: number
}

/** Centre of a barangay's bounding box, to anchor its pinned tooltip. */
const centroidOf = (
    data: RiskFeatureCollection,
    id: number,
): [number, number] | null => {
    const box = featureBoundsById(data, id)
    return box ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : null
}

const GISMap = ({ data, selectedId, onSelect, panelWidth }: GISMapProps) => {
    const [hoveredId, setHoveredId] = useState<number | null>(null)
    const { isOperator } = useAuth()
    const [layers, setLayers] = useState<LayerVisibility>({
        hazard: true,
        evacuation: true,
    })
    const toggleLayer = (key: LayerKey) => setLayers((l) => ({ ...l, [key]: !l[key] }))
    const [logOpen, setLogOpen] = useState(false)

    const pinnedCentroid =
        data && selectedId != null ? centroidOf(data, selectedId) : null
    const hoverCentroid =
        data && hoveredId != null && hoveredId !== selectedId
            ? centroidOf(data, hoveredId)
            : null

    return (
        <div className='relative h-full w-full overflow-hidden'>
            {/* Top toolbar: layer toggles (everyone) + operator edit-history link. */}
            <div className='absolute top-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background/95 px-2 py-1.5 shadow-md backdrop-blur'>
                <LayersControl layers={layers} onToggle={toggleLayer} />
                {isOperator && (
                    <>
                        <div className='bg-border mx-1 h-5 w-px' />
                        <Button
                            size='sm'
                            variant='ghost'
                            className='cursor-pointer rounded-full'
                            onClick={() => setLogOpen(true)}
                        >
                            <History className='size-4' />
                            View edit history
                        </Button>
                    </>
                )}
            </div>

            <Map center={[122.07, 6.92]} zoom={11} theme='light'>
                <MapControls position='bottom-left' showFullscreen={true} />
                {data && (
                    <>
                        <BarangayChoropleth
                            data={data}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            onHover={setHoveredId}
                            panelWidth={panelWidth}
                        />
                        {/* Pinned tooltip for the selected barangay. */}
                        {selectedId != null && pinnedCentroid && (
                            <BarangayTooltip
                                data={data}
                                id={selectedId}
                                lngLat={pinnedCentroid}
                                pinned
                                onClose={() => onSelect(null)}
                            />
                        )}
                        {/* Transient tooltip while hovering a different barangay. */}
                        {hoveredId != null && hoveredId !== selectedId && hoverCentroid && (
                            <BarangayTooltip
                                data={data}
                                id={hoveredId}
                                lngLat={hoverCentroid}
                            />
                        )}
                    </>
                )}
                {/* Primary hazard geometry — rendered after the choropleth so it
                    reads on top; the choropleth's fill is tuned thin (see
                    BarangayChoropleth) to read as an administrative overlay. */}
                <HazardZoneLayer visible={layers.hazard} />
                <EvacuationLayer visible={layers.evacuation} focusedBarangayId={selectedId} />
            </Map>

            <PoiLogDialog open={logOpen} onOpenChange={setLogOpen} />
        </div>
    )
}

export default GISMap
