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

/** Zoom level at which the layer swaps the simplified geometry for the
 * full-precision one. Below this, the generalized shapes read fine at a
 * fraction of the payload; above it, the extra vertices become visible. */
const DETAIL_ZOOM_THRESHOLD = 13

/** Color each zone by its *computed* localized risk (rainfall-gated), keyed on
 * the `category` joined into each feature. Falls back to grey before scores load
 * or when the pipeline hasn't run. */
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

/**
 * The authoritative flood-susceptibility zones, colored by the **computed
 * per-zone risk** for the current cycle (`rainfall × susceptibility`) rather
 * than the static susceptibility class — so a high-susceptibility zone reads as
 * calm when it isn't raining and lights up only when rain actually arrives.
 */
const HazardZoneLayer = ({ visible, colorBy, visibleLevels }: Props) => {
    const { map, isLoaded } = useMap()
    const [zoom, setZoom] = useState(() => map?.getZoom() ?? 0)
    const { data: simplified } = useHazardZones()
    const showDetailed = zoom >= DETAIL_ZOOM_THRESHOLD
    const { data: detailed } = useHazardZonesDetailed(showDetailed)
    const { data: zoneRisk } = useZoneRisk()

    // Track zoom so we know when to swap to the full-precision geometry. Fires
    // continuously during a zoom gesture; cheap since it's just a number compare.
    useEffect(() => {
        if (!map) return
        const handleZoom = () => setZoom(map.getZoom())
        handleZoom()
        map.on('zoom', handleZoom)
        return () => {
            map.off('zoom', handleZoom)
        }
    }, [map])

    // Prefer the detailed geometry once zoomed in and it has loaded; fall back
    // to simplified otherwise (zoomed out, or detailed still fetching).
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

    // Add the source + layers ONCE (empty), tied only to the map lifecycle. The
    // actual features/colors are pushed via setData below — re-adding the layers
    // whenever scores refresh is what caused the flicker + freeze.
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
        // colorBy is applied on add here and updated by its own effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, isLoaded])

    // Push features + risk colors by updating the source data in place — cheap,
    // and it never removes/re-adds the layer (no flicker).
    useEffect(() => {
        if (!map || !isLoaded || !joined) return
        const source = map.getSource(SOURCE) as GeoJSONSource | undefined
        source?.setData(joined)
    }, [map, isLoaded, joined])

    // Swap the fill palette when the view toggles — a paint-property change, so
    // no layer churn.
    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer(FILL)) return
        map.setPaintProperty(FILL, 'fill-color', colorExpressionFor(colorBy))
    }, [map, isLoaded, colorBy])

    // Show only the susceptibility levels switched on in the layer toggles.
    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer(FILL)) return
        const filter: ExpressionSpecification = ['in', ['get', 'level'], ['literal', visibleLevels]]
        for (const id of [FILL, LINE]) if (map.getLayer(id)) map.setFilter(id, filter)
        // levelKey captures the level set; visibleLevels itself is a fresh array each render.
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
