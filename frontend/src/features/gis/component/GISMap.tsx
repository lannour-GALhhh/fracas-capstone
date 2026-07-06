import { useRef, useState } from 'react'
import { Check, MapPin, Plus, TriangleAlert } from 'lucide-react'
import { Map, MapControls } from '@/common/ui/map'
import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import { useAuth } from '@/features/auth/context/useAuth'
import type { DamGeoCollection, RiskFeatureCollection } from '../types/api'
import { featureBoundsById } from '../utils/bounds'
import BarangayChoropleth from './BarangayChoropleth'
import BarangayTooltip from './BarangayTooltip'
import DamLayer from './DamLayer'
import EvacuationLayer from '../poi/EvacuationLayer'
import HotspotLayer from '../poi/HotspotLayer'
import LayersControl from './LayersControl'
import { type LayerKey, type LayerVisibility } from '../constants/layers'
import type { PoiLayerHandle } from '../poi/types'
import type { PoiEditor } from '../poi/usePoiEditor'

interface GISMapProps {
    data: RiskFeatureCollection | null
    selectedId: number | null
    onSelect: (id: number | null) => void
    panelWidth: number
    damGeo: DamGeoCollection | undefined
    selectedDamId: number | null
    onSelectDam: (id: number) => void
    editor: PoiEditor
}

/** Centre of a barangay's bounding box, to anchor its pinned tooltip. */
const centroidOf = (
    data: RiskFeatureCollection,
    id: number,
): [number, number] | null => {
    const box = featureBoundsById(data, id)
    return box ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : null
}

/** One row in the operator's vertical "edit places" menu. */
const MenuItem = ({
    icon: Icon,
    label,
    onClick,
}: {
    icon: typeof Plus
    label: string
    onClick: () => void
}) => (
    <button
        type='button'
        onClick={onClick}
        className='hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors'
    >
        <Icon className='size-4 shrink-0' />
        {label}
    </button>
)

const GISMap = ({
    data,
    selectedId,
    onSelect,
    panelWidth,
    damGeo,
    selectedDamId,
    onSelectDam,
    editor,
}: GISMapProps) => {
    const [hoveredId, setHoveredId] = useState<number | null>(null)
    const { isOperator } = useAuth()
    const editMode = editor.editMode
    const [layers, setLayers] = useState<LayerVisibility>({
        dam: true,
        evacuation: true,
        hotspot: true,
    })
    const toggleLayer = (key: LayerKey) => setLayers((l) => ({ ...l, [key]: !l[key] }))

    const evacRef = useRef<PoiLayerHandle>(null)
    const hotspotRef = useRef<PoiLayerHandle>(null)

    const pinnedCentroid =
        data && selectedId != null ? centroidOf(data, selectedId) : null
    const hoverCentroid =
        data && hoveredId != null && hoveredId !== selectedId
            ? centroidOf(data, hoveredId)
            : null

    return (
        <div className='relative h-full w-full overflow-hidden'>
            {/* Top toolbar: layer toggles (everyone) + operator POI editing. */}
            <div className='absolute top-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background/95 px-2 py-1.5 shadow-md backdrop-blur'>
                <LayersControl layers={layers} onToggle={toggleLayer} />
                {isOperator && (
                    <>
                        <div className='bg-border mx-1 h-5 w-px' />
                        <div className='relative'>
                            <Button
                                size='sm'
                                variant={editMode ? 'default' : 'ghost'}
                                className='cursor-pointer rounded-full'
                                onClick={editor.toggleEdit}
                            >
                                <MapPin className='size-4' />
                                {editMode ? 'Editing places' : 'Edit points of interest'}
                            </Button>
                            {editMode && (
                                <Card
                                    size='sm'
                                    className='absolute top-[calc(100%+10px)] left-1/2 z-20 flex w-52 -translate-x-1/2 flex-col gap-0.5 p-1.5'
                                >
                                    <MenuItem
                                        icon={Plus}
                                        label='Add evacuation center'
                                        onClick={() => evacRef.current?.startAdd()}
                                    />
                                    <MenuItem
                                        icon={TriangleAlert}
                                        label='Add flood hotspot'
                                        onClick={() => hotspotRef.current?.startAdd()}
                                    />
                                    <div className='bg-border my-0.5 h-px' />
                                    <MenuItem icon={Check} label='Done editing' onClick={editor.toggleEdit} />
                                </Card>
                            )}
                        </div>
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
                            disabled={editMode}
                        />
                        {/* Pinned tooltip for the selected barangay (hidden while editing). */}
                        {!editMode && selectedId != null && pinnedCentroid && (
                            <BarangayTooltip
                                data={data}
                                id={selectedId}
                                lngLat={pinnedCentroid}
                                pinned
                                onClose={() => onSelect(null)}
                            />
                        )}
                        {/* Transient tooltip while hovering a different barangay. */}
                        {!editMode && hoveredId != null && hoveredId !== selectedId && hoverCentroid && (
                            <BarangayTooltip
                                data={data}
                                id={hoveredId}
                                lngLat={hoverCentroid}
                            />
                        )}
                    </>
                )}
                <DamLayer
                    data={damGeo}
                    visible={layers.dam}
                    selectedDamId={selectedDamId}
                    onSelectDam={onSelectDam}
                />
                <EvacuationLayer
                    ref={evacRef}
                    visible={layers.evacuation}
                    editor={editor}
                    focusedBarangayId={selectedId}
                />
                <HotspotLayer
                    ref={hotspotRef}
                    visible={layers.hotspot}
                    editor={editor}
                    focusedBarangayId={selectedId}
                />
            </Map>
        </div>
    )
}

export default GISMap
