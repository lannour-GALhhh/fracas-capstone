import { useEffect, useMemo } from 'react'
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { useMap } from '@/common/ui/map'
import { useHazardZones } from '../hooks/useHazardZones'
import { useZoneRisk } from '../hooks/useZoneRisk'
import { NO_DATA_COLOR, RISK_COLORS } from '../constants/risk'
import {
    fillColorExpression as susceptibilityColorExpression,
    type ZoneColorMode,
} from '../constants/susceptibility'
import type { HazardZoneCollection } from '../types/api'

const SOURCE = 'hazard-zones'
const FILL = 'hazard-zone-fill'
const LINE = 'hazard-zone-line'

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
const HazardZoneLayer = ({ visible, colorBy }: Props) => {
    const { map, isLoaded } = useMap()
    const { data } = useHazardZones()
    const { data: zoneRisk } = useZoneRisk()

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
