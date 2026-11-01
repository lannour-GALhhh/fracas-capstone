import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { affectedBarangays } from '@/features/evacuation/utils/affected'
import { MapPin } from 'lucide-react'
import { Map, MapControls, MapMarker, MarkerContent, useMap, type MapRef } from '@/common/ui/map'
import { useAuth } from '@/features/auth/context/useAuth'
import MassEvacuationDialog from '@/features/evacuation/component/MassEvacuationDialog'
import MassEvacuationControls from './MassEvacuationControls'
import RadiusEvacuationButton from './RadiusEvacuationButton'
import RadiusEvacuationPanel from '@/features/evacuation/component/RadiusEvacuationPanel'
import RadiusEvacuationLayer from '@/features/evacuation/map/RadiusEvacuationLayer'
import type { RiskFeatureCollection, SusceptibilityLevel } from '../types/api'
import { collectionBounds, featureBoundsById, fitBox } from '../utils/bounds'
import BarangayChoropleth from './BarangayChoropleth'
import BarangayTooltip from './BarangayTooltip'
import HazardZoneLayer from './HazardZoneLayer'
import EvacuationLayer from '../poi/EvacuationLayer'
import FocusCenter from '../poi/FocusCenter'
import EvacuationPingLayer from '@/features/evacuation/map/EvacuationPingLayer'
import EvacuationPulseLayer from '@/features/evacuation/map/EvacuationPulseLayer'
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
    /** Evacuation center to fly to on load (from the Evacuation Centers page). */
    focusCenterId?: number | null
}

/** Centre of a barangay's bounding box, to anchor its hover tooltip. */
const centroidOf = (
    data: RiskFeatureCollection,
    id: number,
): [number, number] | null => {
    const box = featureBoundsById(data, id)
    return box ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : null
}

/** While mounted, a map click reports its coordinates (crosshair cursor). */
const MapPlacementClick = ({ onPlace }: { onPlace: (p: { lng: number; lat: number }) => void }) => {
    const { map } = useMap()
    useEffect(() => {
        if (!map) return
        const canvas = map.getCanvas()
        // Pointer by default; the grab hand only while dragging the map.
        const point = () => (canvas.style.cursor = 'pointer')
        const grab = () => (canvas.style.cursor = 'grabbing')
        point()
        map.on('mousemove', point)
        map.on('mousedown', grab)
        map.on('mouseup', point)
        map.on('dragend', point)
        const handle = (e: { lngLat: { lng: number; lat: number } }) =>
            onPlace({ lng: e.lngLat.lng, lat: e.lngLat.lat })
        map.on('click', handle)
        return () => {
            map.off('click', handle)
            map.off('mousemove', point)
            map.off('mousedown', grab)
            map.off('mouseup', point)
            map.off('dragend', point)
            canvas.style.cursor = ''
        }
    }, [map, onPlace])
    return null
}

const GISMap = ({
    data,
    selectedId,
    onSelect,
    panelWidth,
    layers,
    zoneColorMode,
    visibleLevels,
    focusCenterId = null,
}: GISMapProps) => {
    const [hoveredId, setHoveredId] = useState<number | null>(null)
    const mapRef = useRef<MapRef>(null)
    const { isOperator } = useAuth()
    const [massActive, setMassActive] = useState(false)
    const [massIds, setMassIds] = useState<number[]>([])
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [radiusActive, setRadiusActive] = useState(false)
    const [radiusPoint, setRadiusPoint] = useState<{ lng: number; lat: number } | null>(null)
    const [radiusM, setRadiusM] = useState(500)

    const endRadius = () => {
        setRadiusActive(false)
        setRadiusPoint(null)
    }

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

    const radiusBarangays = useMemo(
        () =>
            radiusPoint ? affectedBarangays(data, radiusPoint.lng, radiusPoint.lat, radiusM) : [],
        [data, radiusPoint, radiusM],
    )

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

    const hoverCentroid = data && hoveredId != null ? centroidOf(data, hoveredId) : null

    return (
        <div className='relative h-full w-full overflow-hidden'>
            {/* Barangay search, centered above the map. */}
            <div className='absolute top-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2'>
                <BarangaySearch data={data} onSelect={onSelect} />
                {isOperator && selectedId == null && !radiusActive && (
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
                {isOperator && selectedId == null && !massActive && !radiusActive && (
                    <RadiusEvacuationButton
                        onClick={() => {
                            onSelect(null)
                            setRadiusActive(true)
                        }}
                    />
                )}
            </div>
            {radiusActive && (
                <div className='absolute top-32 left-1/2 z-10 -translate-x-1/2'>
                    <RadiusEvacuationPanel
                        point={radiusPoint}
                        radiusM={radiusM}
                        barangays={radiusBarangays}
                        onRadiusChange={setRadiusM}
                        onCancel={endRadius}
                        onDone={endRadius}
                    />
                </div>
            )}
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
                <FocusCenter centerId={focusCenterId} />
                {data && (
                    <>
                        <BarangayChoropleth
                            data={data}
                            selectedId={selectedId}
                            onSelect={massActive ? toggleMass : onSelect}
                            onHover={setHoveredId}
                            panelWidth={panelWidth}
                            skipInitialFit={focusCenterId != null}
                            disabled={radiusActive}
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
                        {/* Tooltip shown only while hovering a barangay. */}
                        {hoveredId != null && hoverCentroid && (
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
                {/* Animated rain over barangays currently getting rain — streak
                    density/speed escalate with the PAGASA band. */}
                <RainfallLayer data={data} visible={layers.rainfall} />
                {/* Pulsing red wash over barangays under an active evacuation. */}
                <EvacuationPulseLayer data={data} visible={layers.underEvacuation} />
                {/* Ping badge stays visible when zoomed out, where the wash is too small to see. */}
                <EvacuationPingLayer data={data} focusedBarangayId={selectedId} />
                {/* Point + radius evacuations, plus the circle being placed. */}
                <RadiusEvacuationLayer
                    visible={layers.underEvacuation}
                    draft={radiusActive && radiusPoint ? { ...radiusPoint, radiusM } : null}
                />
                {radiusActive && <MapPlacementClick onPlace={setRadiusPoint} />}
                {radiusActive && radiusPoint && (
                    <MapMarker longitude={radiusPoint.lng} latitude={radiusPoint.lat}>
                        <MarkerContent>
                            <MapPin className='size-8 fill-red-600 text-white drop-shadow' />
                        </MarkerContent>
                    </MapMarker>
                )}
            </Map>
        </div>
    )
}

export default GISMap
