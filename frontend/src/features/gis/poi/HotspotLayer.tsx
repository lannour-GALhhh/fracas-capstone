import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react'
import type { Feature, Point, Polygon } from 'geojson'
import type { GeoJSONSource } from 'maplibre-gl'
import { TriangleAlert } from 'lucide-react'
import { MapMarker, MarkerContent, MarkerPopup, useMap } from '@/common/ui/map'
import { Badge } from '@/common/ui/badge'
import { useHotspots, useHotspotMutations } from './usePoi'
import { circleRing, SEVERITY_COLOR } from './geo'
import type { HotspotProperties, HotspotSeverity, PoiLayerHandle } from './types'
import type { PoiEditor } from './usePoiEditor'

const SOURCE = 'flood-hotspots'
const FILL = 'flood-hotspots-fill'
const LINE = 'flood-hotspots-line'
export const DEFAULT_HOTSPOT_RADIUS = 300

type HotspotFeature = Feature<Point, HotspotProperties>

interface AreaInput {
    lng: number
    lat: number
    radius_m: number
    severity: HotspotSeverity
}

/** Translucent radius circles drawn beneath the hotspot markers. */
const HotspotAreas = ({ areas }: { areas: AreaInput[] }) => {
    const { map, isLoaded } = useMap()

    const data = useMemo(
        () => ({
            type: 'FeatureCollection' as const,
            features: areas.map(
                (a): Feature<Polygon, { severity: string }> => ({
                    type: 'Feature',
                    properties: { severity: a.severity },
                    geometry: { type: 'Polygon', coordinates: [circleRing(a.lng, a.lat, a.radius_m)] },
                }),
            ),
        }),
        [areas],
    )

    useEffect(() => {
        if (!map || !isLoaded) return
        const color: (string | string[])[] = [
            'match',
            ['get', 'severity'],
            'low',
            SEVERITY_COLOR.low,
            'medium',
            SEVERITY_COLOR.medium,
            'high',
            SEVERITY_COLOR.high,
            '#f97316',
        ]
        map.addSource(SOURCE, { type: 'geojson', data })
        map.addLayer({
            id: FILL,
            type: 'fill',
            source: SOURCE,
            paint: { 'fill-color': color as never, 'fill-opacity': 0.18 },
        })
        map.addLayer({
            id: LINE,
            type: 'line',
            source: SOURCE,
            paint: { 'line-color': color as never, 'line-width': 1.5, 'line-opacity': 0.6, 'line-dasharray': [2, 1] },
        })
        return () => {
            if (!map.style) return
            for (const id of [FILL, LINE]) if (map.getLayer(id)) map.removeLayer(id)
            if (map.getSource(SOURCE)) map.removeSource(SOURCE)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, isLoaded])

    useEffect(() => {
        if (!map || !isLoaded) return
        ;(map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(data)
    }, [map, isLoaded, data])

    return null
}

const Marker = ({ severity, active }: { severity: HotspotSeverity; active?: boolean }) => (
    <div
        className={`flex size-7 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform ${
            active ? 'scale-125 ring-2 ring-sky-500 ring-offset-2' : ''
        }`}
        style={{ backgroundColor: SEVERITY_COLOR[severity] }}
    >
        <TriangleAlert className='size-4 text-white' />
    </div>
)

const ReadOnlyDetails = ({ p }: { p: HotspotProperties }) => (
    <div className='flex w-52 flex-col gap-1'>
        <div className='flex items-center justify-between gap-2'>
            <span className='font-medium'>{p.name}</span>
            <Badge
                variant='outline'
                className='capitalize'
                style={{ borderColor: SEVERITY_COLOR[p.severity], color: SEVERITY_COLOR[p.severity] }}
            >
                {p.severity}
            </Badge>
        </div>
        <span className='text-amber-600 text-xs font-medium'>Elevated flood risk — flooded area</span>
        <span className='text-muted-foreground text-xs'>Radius: {p.radius_m} m</span>
        {p.description && <span className='text-muted-foreground text-xs'>{p.description}</span>}
        {p.barangay_name && <span className='text-muted-foreground text-xs'>{p.barangay_name}</span>}
    </div>
)

interface Props {
    visible: boolean
    editor: PoiEditor
    focusedBarangayId: number | null
}

const HotspotLayer = forwardRef<PoiLayerHandle, Props>(function HotspotLayer(
    { visible, editor, focusedBarangayId },
    ref,
) {
    const { map } = useMap()
    const { data } = useHotspots()
    const { update } = useHotspotMutations()
    const editMode = editor.editMode

    useImperativeHandle(
        ref,
        () => ({
            startAdd: () => {
                if (!map) return
                const c = map.getCenter()
                editor.startCreate('hotspot', { lng: c.lng, lat: c.lat })
            },
        }),
        [map, editor],
    )

    const effectiveVisible = visible || editMode
    const features = (data?.features ?? []) as HotspotFeature[]
    const shown = effectiveVisible
        ? features
        : features.filter((f) => f.properties.barangay === focusedBarangayId)

    // Live preview values for whichever hotspot the edit panel currently drives.
    const activeId = editor.active?.kind === 'hotspot' ? editor.active.id : undefined
    const preview = editor.active?.kind === 'hotspot' ? editor.preview : null
    const drafting = editor.active?.kind === 'hotspot' && editor.active.id === null

    const areas: AreaInput[] = shown.map((f) => {
        const isActive = activeId != null && f.properties.id === activeId
        return {
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            radius_m: isActive && preview ? preview.radius_m : f.properties.radius_m,
            severity: isActive && preview ? preview.severity : f.properties.severity,
        }
    })
    const draftSeverity = preview?.severity ?? 'medium'
    if (drafting && editor.draft)
        areas.push({
            lng: editor.draft.lng,
            lat: editor.draft.lat,
            radius_m: preview?.radius_m ?? DEFAULT_HOTSPOT_RADIUS,
            severity: draftSeverity,
        })

    return (
        <>
            <HotspotAreas areas={areas} />

            {shown.map((f) => {
                const [lng, lat] = f.geometry.coordinates
                const p = f.properties
                const isActive = activeId != null && p.id === activeId
                return (
                    <MapMarker
                        key={p.id}
                        longitude={lng}
                        latitude={lat}
                        draggable={editMode}
                        onClick={() => editMode && editor.selectExisting('hotspot', p.id)}
                        onDragEnd={({ lng, lat }) =>
                            update.mutate({ id: p.id, payload: { latitude: lat, longitude: lng } })
                        }
                    >
                        <MarkerContent>
                            <Marker
                                severity={isActive && preview ? preview.severity : p.severity}
                                active={isActive}
                            />
                        </MarkerContent>
                        {/* Read-only info only when not editing; edit uses the side panel. */}
                        {!editMode && (
                            <MarkerPopup closeButton className='max-w-72'>
                                <ReadOnlyDetails p={p} />
                            </MarkerPopup>
                        )}
                    </MapMarker>
                )
            })}

            {drafting && editor.draft && (
                <MapMarker
                    longitude={editor.draft.lng}
                    latitude={editor.draft.lat}
                    draggable
                    onDragEnd={({ lng, lat }) => editor.moveDraft({ lng, lat })}
                >
                    <MarkerContent>
                        <Marker severity={draftSeverity} active />
                    </MarkerContent>
                </MapMarker>
            )}
        </>
    )
})

export default HotspotLayer
