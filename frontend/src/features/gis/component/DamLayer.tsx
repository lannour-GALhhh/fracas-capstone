import { useMemo } from 'react'
import type { Position } from 'geojson'
import { Droplets } from 'lucide-react'
import { MapMarker, MarkerContent, MarkerTooltip, MapRoute } from '@/common/ui/map'
import type { DamGeoCollection } from '../types/api'

interface Props {
    data: DamGeoCollection | undefined
    /** Whether the layer is toggled on. */
    visible: boolean
    /** The currently selected dam id (highlights its marker). */
    selectedDamId: number | null
    onSelectDam: (id: number) => void
}

/** River colour — a calm hydrological blue that reads over the choropleth. */
const RIVER_COLOR = '#2563eb'

/** The dam point + its river corridor, rendered as an overlay on the GIS map. */
const DamLayer = ({ data, visible, selectedDamId, onSelectDam }: Props) => {
    const { dams, rivers } = useMemo(() => {
        const dams: { id: number; name: string; lng: number; lat: number }[] = []
        const rivers: { id: string; coords: [number, number][] }[] = []
        for (const f of data?.features ?? []) {
            if (f.properties.kind === 'dam' && f.geometry.type === 'Point') {
                const [lng, lat] = f.geometry.coordinates
                dams.push({ id: f.properties.id, name: f.properties.name, lng, lat })
            } else if (f.properties.kind === 'river' && f.geometry.type === 'MultiLineString') {
                f.geometry.coordinates.forEach((line: Position[], i: number) => {
                    rivers.push({
                        id: `${f.properties.id}-${i}`,
                        coords: line.map(([lng, lat]) => [lng, lat] as [number, number]),
                    })
                })
            }
        }
        return { dams, rivers }
    }, [data])

    if (!visible) return null

    return (
        <>
            {rivers.map((r) => (
                <MapRoute
                    key={r.id}
                    id={`dam-river-${r.id}`}
                    coordinates={r.coords}
                    color={RIVER_COLOR}
                    width={3}
                    opacity={0.75}
                    interactive={false}
                />
            ))}
            {dams.map((d) => {
                const selected = d.id === selectedDamId
                return (
                    <MapMarker
                        key={d.id}
                        longitude={d.lng}
                        latitude={d.lat}
                        onClick={(e) => {
                            e.stopPropagation()
                            onSelectDam(d.id)
                        }}
                    >
                        <MarkerContent>
                            <div
                                className={`flex items-center justify-center rounded-full border-2 border-white shadow-lg transition-all ${
                                    selected ? 'size-9 bg-blue-700 ring-2 ring-blue-300' : 'size-7 bg-blue-600'
                                }`}
                            >
                                <Droplets className='size-4 text-white' />
                            </div>
                        </MarkerContent>
                        <MarkerTooltip>{d.name}</MarkerTooltip>
                    </MapMarker>
                )
            })}
        </>
    )
}

export default DamLayer
