import type { Feature, Point } from 'geojson'
import type { ReactNode } from 'react'
import { Phone, Tent, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MapMarker, MarkerContent, MarkerPopup } from '@/common/ui/map'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import { useEffect, useMemo } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMap } from '@/common/ui/map'
import { circlePolygon } from '@/features/evacuation/utils/circle'
import { useEvacuationCenters } from './usePoi'
import type { EvacuationProperties } from './types'

interface Props {
    /** Layer toggle. When off, only centers inside the focused barangay show. */
    visible: boolean
    focusedBarangayId: number | null
}

const Pin = ({ tone }: { tone: 'active' | 'inactive' }) => {
    const color = tone === 'inactive' ? 'bg-slate-400 opacity-60 grayscale' : 'bg-emerald-600'
    return (
        <div
            className={`flex size-7 items-center justify-center rounded-full border-2 border-white shadow-lg ${color}`}
        >
            <Tent className='size-4 text-white' />
        </div>
    )
}

const Row = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
    <div className='bg-muted/50 flex items-center justify-between gap-4 rounded-lg px-2.5 py-1.5'>
        <span className='text-muted-foreground flex items-center gap-2 text-[13px]'>
            {icon}
            {label}
        </span>
        <span className='min-w-0 truncate text-base font-medium tabular-nums'>{value}</span>
    </div>
)

const ReadOnlyDetails = ({ p }: { p: EvacuationProperties }) => {
    const navigate = useNavigate()
    return (
    <div className='flex w-80 flex-col gap-2.5 font-sans'>
        <div className='flex items-start justify-between gap-3'>
            <span className='text-[15px] font-semibold tracking-wide uppercase'>{p.name}</span>
            <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
                    p.is_active ? 'bg-emerald-600/10 text-emerald-600' : 'bg-slate-400/15 text-slate-500'
                }`}
                title={p.is_active ? 'Active' : 'Inactive'}
            >
                <Tent className='size-4' />
            </span>
        </div>
        {!p.is_active && (
            <Badge variant='secondary' className='w-fit'>
                Inactive
            </Badge>
        )}
        {(p.capacity != null || p.contacts.length > 0) && (
            <div className='flex flex-col gap-1'>
                {p.capacity != null && (
                    <Row
                        icon={<Users className='size-4' />}
                        label='Capacity'
                        value={`${p.capacity.toLocaleString()} ${p.capacity_unit}`.trim()}
                    />
                )}
                {p.contacts.map((c) => (
                    <Row
                        key={c.id}
                        icon={<Phone className='size-4' />}
                        label={c.label || 'Contact'}
                        value={c.phone}
                    />
                ))}
            </div>
        )}
        <Button
            size='sm'
            variant='outline'
            onClick={() => navigate(`/evacuation-centers?center=${p.id}`)}
        >
            View evacuation center
        </Button>
    </div>
    )
}

type EvacFeature = Feature<Point, EvacuationProperties>

const RADIUS_SOURCE = 'evac-center-radius'
const RADIUS_FILL = 'evac-center-radius-fill'
const RADIUS_LINE = 'evac-center-radius-line'

/** Draws each shown center's auto-evacuation radius as a green circle. */
const CenterRadiusCircles = ({ centers }: { centers: EvacFeature[] }) => {
    const { map, isLoaded } = useMap()

    const circles = useMemo(
        () => ({
            type: 'FeatureCollection' as const,
            features: centers
                .filter((f) => f.properties.is_active && f.properties.radius_m > 0)
                .map((f) => ({
                    type: 'Feature' as const,
                    properties: { id: f.properties.id },
                    geometry: circlePolygon(f.geometry.coordinates[0], f.geometry.coordinates[1], f.properties.radius_m),
                })),
        }),
        [centers],
    )

    useEffect(() => {
        if (!map || !isLoaded) return
        map.addSource(RADIUS_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer({
            id: RADIUS_FILL,
            type: 'fill',
            source: RADIUS_SOURCE,
            paint: { 'fill-color': '#059669', 'fill-opacity': 0.15 },
        })
        map.addLayer({
            id: RADIUS_LINE,
            type: 'line',
            source: RADIUS_SOURCE,
            paint: { 'line-color': '#059669', 'line-width': 2, 'line-dasharray': [2, 2] },
        })
        return () => {
            if (!map.style) return
            for (const id of [RADIUS_LINE, RADIUS_FILL]) if (map.getLayer(id)) map.removeLayer(id)
            if (map.getSource(RADIUS_SOURCE)) map.removeSource(RADIUS_SOURCE)
        }
    }, [map, isLoaded])

    useEffect(() => {
        if (!map || !isLoaded) return
        ;(map.getSource(RADIUS_SOURCE) as GeoJSONSource | undefined)?.setData(circles)
    }, [map, isLoaded, circles])

    return null
}

/** Read-only evacuation-center markers; managed from the Evacuation Centers page, not the map. */
const EvacuationLayer = ({ visible, focusedBarangayId }: Props) => {
    const { data } = useEvacuationCenters()

    const features = (data?.features ?? []) as EvacFeature[]
    const shown = visible
        ? features
        : features.filter((f) => f.properties.barangay === focusedBarangayId)

    return (
        <>
            <CenterRadiusCircles centers={shown} />
            {shown.map((f) => {
                const [lng, lat] = f.geometry.coordinates
                const p = f.properties
                return (
                    <MapMarker key={p.id} longitude={lng} latitude={lat} draggable={false}>
                        <MarkerContent>
                            <Pin tone={p.is_active ? 'active' : 'inactive'} />
                        </MarkerContent>
                        <MarkerPopup className='max-w-none'>
                            <ReadOnlyDetails p={p} />
                        </MarkerPopup>
                    </MapMarker>
                )
            })}
        </>
    )
}

export default EvacuationLayer
