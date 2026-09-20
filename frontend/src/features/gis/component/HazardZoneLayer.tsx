import { useEffect, useMemo, useState } from 'react'
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { useMap } from '@/common/ui/map'
import { useHazardZones, useHazardZonesDetailed } from '../hooks/useHazardZones'
import { useZoneRisk } from '../hooks/useZoneRisk'
import { NO_DATA_COLOR, RISK_COLORS } from '../constants/risk'
import {
    fillColorExpression as susceptibilityColorExpression,
    type ZoneColorMode,
} from '../constants/susceptibility'
import type { HazardZoneCollection, SusceptibilityLevel } from '../types/api'

const SOURCE = 'hazard-zones'
const FILL = 'hazard-zone-fill'
const LINE = 'hazard-zone-line'

/** Zoom level at which the layer swaps to full-precision geometry. */
const DETAIL_ZOOM_THRESHOLD = 13

/** Colors each zone by its computed risk category; grey before scores load. */
const riskColorExpression: ExpressionSpecification = [
    'match',
    ['get', 'category'],
    'low', RISK_COLORS.low,
    'medium', RISK_COLORS.medium,
    'high', RISK_COLORS.high,
    'critical', RISK_COLORS.critical,
    NO_DATA_COLOR,
]

const colorExpressionFor = (mode: ZoneColorMode): ExpressionSpecification =>
    mode === 'susceptibility' ? susceptibilityColorExpression : riskColorExpression

interface Props {
    visible: boolean
    /** Whether the zones are shaded by susceptibility class or computed risk. */
    colorBy: ZoneColorMode
    /** Only zones of these susceptibility levels are shown (per the layer toggles). */
    visibleLevels: SusceptibilityLevel[]
}

/** First symbol (label) layer, so our fills sit under place names, not over them. */
const firstSymbolLayerId = (map: MapLibreMap): string | undefined =>
    map.getStyle().layers?.find((l) => l.type === 'symbol')?.id

/** Flood-susceptibility zones, colored by computed per-cycle risk. */
const HazardZoneLayer = ({ visible, colorBy, visibleLevels }: Props) => {
    const { map, isLoaded } = useMap()
    const [zoom, setZoom] = useState(() => map?.getZoom() ?? 0)
    const { data: simplified } = useHazardZones()
    const showDetailed = zoom >= DETAIL_ZOOM_THRESHOLD
    const { data: detailed } = useHazardZonesDetailed(showDetailed)
    const { data: zoneRisk } = useZoneRisk()

    useEffect(() => {
        if (!map) return
        const handleZoom = () => setZoom(map.getZoom())
        handleZoom()
        map.on('zoom', handleZoom)
        return () => {
            map.off('zoom', handleZoom)
        }
    }, [map])

    const data = showDetailed && detailed ? detailed : simplified

    // Key on the sorted level set so the filter effect only re-runs on a real change.
    const levelKey = [...visibleLevels].sort().join(',')

    // Join each zone's computed risk category onto its feature properties.
    const joined = useMemo<HazardZoneCollection | undefined>(() => {
        if (!data) return undefined
        return {
            ...data,
            features: data.features.map((f) => {
                const risk = zoneRisk?.get(`${f.properties.barangay}-${f.properties.level}`)
                return {
                    ...f,
                    properties: { ...f.properties, category: risk?.category ?? null, score: risk?.score ?? null },
                }
            }),
        }
    }, [data, zoneRisk])

    // Add source + layers once (empty); re-adding them on refresh caused flicker/freeze.
    useEffect(() => {
        if (!map || !isLoaded) return
        const beforeId = firstSymbolLayerId(map)

        map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer(
            {
                id: FILL,
                type: 'fill',
                source: SOURCE,
                paint: { 'fill-color': colorExpressionFor(colorBy), 'fill-opacity': 0.55 },
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, isLoaded])

    useEffect(() => {
        if (!map || !isLoaded || !joined) return
        const source = map.getSource(SOURCE) as GeoJSONSource | undefined
        source?.setData(joined)
    }, [map, isLoaded, joined])

    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer(FILL)) return
        map.setPaintProperty(FILL, 'fill-color', colorExpressionFor(colorBy))
    }, [map, isLoaded, colorBy])

    // Show only the susceptibility levels switched on in the layer toggles.
    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer(FILL)) return
        const filter: ExpressionSpecification = ['in', ['get', 'level'], ['literal', visibleLevels]]
        for (const id of [FILL, LINE]) if (map.getLayer(id)) map.setFilter(id, filter)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, isLoaded, levelKey])

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
