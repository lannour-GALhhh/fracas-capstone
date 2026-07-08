import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useMap } from '@/common/ui/map'
import { useHazardZones } from '../hooks/useHazardZones'
import { fillColorExpression } from '../constants/susceptibility'

const SOURCE = 'hazard-zones'
const FILL = 'hazard-zone-fill'
const LINE = 'hazard-zone-line'

interface Props {
    visible: boolean
}

/** First symbol (label) layer, so our fills sit under place names, not over them. */
const firstSymbolLayerId = (map: MapLibreMap): string | undefined =>
    map.getStyle().layers?.find((l) => l.type === 'symbol')?.id

/**
 * The authoritative flood-susceptibility zones — the primary hazard geometry
 * on the map (see `ENGINE_V2_PLAN.md` Phase 5). Read-only backdrop: no
 * click/hover interaction, just the classification fill + a thin outline.
 */
const HazardZoneLayer = ({ visible }: Props) => {
    const { map, isLoaded } = useMap()
    const { data } = useHazardZones()

    useEffect(() => {
        if (!map || !isLoaded || !data) return
        const beforeId = firstSymbolLayerId(map)

        map.addSource(SOURCE, { type: 'geojson', data })
        map.addLayer(
            {
                id: FILL,
                type: 'fill',
                source: SOURCE,
                paint: { 'fill-color': fillColorExpression, 'fill-opacity': 0.55 },
            },
            beforeId,
        )
        map.addLayer(
            {
                id: LINE,
                type: 'line',
                source: SOURCE,
                paint: { 'line-color': '#ffffff', 'line-width': 0.5, 'line-opacity': 0.4 },
            },
            beforeId,
        )

        return () => {
            if (!map.style) return
            for (const id of [FILL, LINE]) if (map.getLayer(id)) map.removeLayer(id)
            if (map.getSource(SOURCE)) map.removeSource(SOURCE)
        }
    }, [map, isLoaded, data])

    useEffect(() => {
        if (!map || !isLoaded) return
        const visibility = visible ? 'visible' : 'none'
        for (const id of [FILL, LINE]) {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility)
        }
    }, [map, isLoaded, visible])

    return null
}

export default HazardZoneLayer
