import { useEffect, useMemo } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMap } from '@/common/ui/map'
import type { RiskFeatureCollection } from '@/features/gis/types/api'
import { useActiveEvacuations } from '../hooks/useActiveEvacuations'

const SOURCE = 'evacuation-pulse'
const FILL = 'evacuation-pulse-fill'
const COLOR = '#dc2626'
const MIN_OPACITY = 0.1
const MAX_OPACITY = 0.55
const PERIOD_MS = 1800

interface Props {
    data: RiskFeatureCollection | null
    visible: boolean
}

/** Plain pulsing red wash over every barangay under active evacuation. */
const EvacuationPulseLayer = ({ data, visible }: Props) => {
    const { map, isLoaded } = useMap()
    const { data: evacuations } = useActiveEvacuations()

    const collection = useMemo(() => {
        const ids = new Set((evacuations ?? []).map((e) => e.barangay.id))
        return {
            type: 'FeatureCollection' as const,
            features: (data?.features ?? []).filter((f) => ids.has(f.properties.id)),
        }
    }, [data, evacuations])

    // Add source + layer once, on top of the other fills but under place labels.
    useEffect(() => {
        if (!map || !isLoaded) return
        const beforeId = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id
        map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer(
            {
                id: FILL,
                type: 'fill',
                source: SOURCE,
                paint: { 'fill-color': COLOR, 'fill-opacity': MIN_OPACITY },
            },
            beforeId,
        )
        return () => {
            // The map may already be torn down (navigating away) — nothing to clean up then.
            if (!map.getStyle()) return
            if (map.getLayer(FILL)) map.removeLayer(FILL)
            if (map.getSource(SOURCE)) map.removeSource(SOURCE)
        }
    }, [map, isLoaded])

    useEffect(() => {
        if (!map || !isLoaded) return
        const source = map.getSource(SOURCE) as GeoJSONSource | undefined
        source?.setData(collection as never)
    }, [map, isLoaded, collection])

    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer(FILL)) return
        map.setLayoutProperty(FILL, 'visibility', visible ? 'visible' : 'none')
        if (!visible || !collection.features.length) return

        let frame = 0
        const tick = (now: number) => {
            const wave = (Math.sin((now / PERIOD_MS) * 2 * Math.PI) + 1) / 2
            if (map.getStyle() && map.getLayer(FILL)) {
                map.setPaintProperty(FILL, 'fill-opacity', MIN_OPACITY + wave * (MAX_OPACITY - MIN_OPACITY))
            }
            frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [map, isLoaded, visible, collection])

    return null
}

export default EvacuationPulseLayer
