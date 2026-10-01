import { useCallback, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Map, MapControls, MapMarker, MarkerContent, type MapRef } from '@/common/ui/map'
import { useAuth } from '@/features/auth/context/useAuth'
import MassEvacuationDialog from '@/features/evacuation/component/MassEvacuationDialog'
import MassEvacuationControls from './MassEvacuationControls'
import type { RiskFeatureCollection, SusceptibilityLevel } from '../types/api'
import { collectionBounds, featureBoundsById, fitBox } from '../utils/bounds'
import BarangayChoropleth from './BarangayChoropleth'
import BarangayTooltip from './BarangayTooltip'
import HazardZoneLayer from './HazardZoneLayer'
import EvacuationLayer from '../poi/EvacuationLayer'
import EvacuationPingLayer from '@/features/evacuation/map/EvacuationPingLayer'
import RainfallLayer from './RainfallLayer'
import BarangaySearch from './BarangaySearch'
import { type LayerVisibility } from '../constants/layers'
import { type ZoneColorMode } from '../constants/susceptibility'

interface GISMapProps {
    data: RiskFeatureCollection | null
    selectedId: number | null
    onSelect: (id: number | null) => void
    panelWidth: number
    layers: LayerVisibility
    zoneColorMode: ZoneColorMode
    /** Susceptibility levels currently switched on — filters the hazard zones. */
    visibleLevels: SusceptibilityLevel[]
}

/** Centre of a barangay's bounding box, to anchor its pinned tooltip. */
const centroidOf = (
    data: RiskFeatureCollection,
    id: number,
): [number, number] | null => {
    const box = featureBoundsById(data, id)
    return box ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : null
}

const GISMap = ({
    data,
    selectedId,
    onSelect,
    panelWidth,
    layers,
    zoneColorMode,
    visibleLevels,
}: GISMapProps) => {
    const [hoveredId, setHoveredId] = useState<number | null>(null)
    const mapRef = useRef<MapRef>(null)
    const { isOperator } = useAuth()
    const [massActive, setMassActive] = useState(false)
    const [massIds, setMassIds] = useState<number[]>([])
    const [confirmOpen, setConfirmOpen] = useState(false)

    const toggleMass = useCallback(
        (id: number | null) => {
            if (id == null) return
            setMassIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))
        },
        [],
    )

    const endMass = () => {
        setMassActive(false)
        setMassIds([])
        setConfirmOpen(false)
    }

    const massTargets = (data?.features ?? [])
        .filter((f) => massIds.includes(f.properties.id))
        .map((f) => ({
            id: f.properties.id,
            name: f.properties.name,
            score: f.properties.score,
            category: f.properties.category,
        }))

    const handleResetView = useCallback(() => {
        const map = mapRef.current
        if (!map || !data) return
        const box = collectionBounds(data)
        if (box) fitBox(map, box, panelWidth, 800)
    }, [data, panelWidth])

    const pinnedCentroid =
        data && selectedId != null ? centroidOf(data, selectedId) : null
    const hoverCentroid =
        data && hoveredId != null && hoveredId !== selectedId
            ? centroidOf(data, hoveredId)
            : null

    return (
        <div className='relative h-full w-full overflow-hidden'>
            {/* Barangay search, centered above the map. */}
            <div className='absolute top-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2'>
                <BarangaySearch data={data} onSelect={onSelect} />
                {isOperator && (
                    <MassEvacuationControls
                        active={massActive}
                        selectedCount={massIds.length}
                        onStart={() => {
                            onSelect(null)
                            setMassActive(true)
                        }}
                        onProceed={() => setConfirmOpen(true)}
                        onCancel={endMass}
                    />
                )}
            </div>
            <MassEvacuationDialog
                open={confirmOpen}
                targets={massTargets}
                onOpenChange={setConfirmOpen}
                onDone={endMass}
            />

            <Map ref={mapRef} center={[122.07, 6.92]} zoom={11} theme='light'>
                <MapControls
                    position='bottom-left'
                    showFullscreen={true}
                    showReset={true}
                    onReset={handleResetView}
                />
                {data && (
                    <>
                        <BarangayChoropleth
                            data={data}
                            selectedId={selectedId}
                            onSelect={massActive ? toggleMass : onSelect}
                            onHover={setHoveredId}
                            panelWidth={panelWidth}
                        />
                        {massActive &&
                            massIds.map((id) => {
                                const at = centroidOf(data, id)
                                return at ? (
                                    <MapMarker key={id} longitude={at[0]} latitude={at[1]}>
                                        <MarkerContent>
                                            <MapPin className='size-8 fill-red-600 text-white drop-shadow' />
                                        </MarkerContent>
                                    </MapMarker>
                                ) : null
                            })}
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
                <HazardZoneLayer
                    visible={layers.hazard}
                    colorBy={zoneColorMode}
                    visibleLevels={visibleLevels}
                />
                <EvacuationLayer visible={layers.evacuation} focusedBarangayId={selectedId} />
                {/* Purple rainfall-intensity badges for barangays currently getting
                    rain — glyph escalates with the PAGASA band. */}
                <RainfallLayer data={data} visible={layers.rainfall} />
                {/* Pulsing evacuated/total badges for barangays under an active
                    evacuation — an alert overlay, always shown when present. */}
                <EvacuationPingLayer data={data} />
            </Map>
        </div>
    )
}

export default GISMap
