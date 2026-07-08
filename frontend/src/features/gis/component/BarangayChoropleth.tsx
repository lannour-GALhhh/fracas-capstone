import { useEffect, useRef } from 'react'
import type {
    GeoJSONSource,
    LngLatBoundsLike,
    Map as MapLibreMap,
    MapGeoJSONFeature,
    MapLayerMouseEvent,
} from 'maplibre-gl'
import { useMap } from '@/common/ui/map'
import type { RiskFeatureCollection } from '../types/api'
import { fillColorExpression } from '../constants/risk'
import { collectionBounds, featureBoundsById, type BBox } from '../utils/bounds'

const SOURCE = 'barangays'
const FILL = 'barangay-fill'
const DIM = 'barangay-dim'
const LINE = 'barangay-line'
const OUTLINE = 'barangay-selected'
const BASE_WASH = 'basemap-wash'
const NONE_ID = -1

/**
 * A white wash over the basemap so its roads/buildings fade back without
 * darkening the map — keeps the light look while letting the choropleth lead.
 */
const BASE_WASH_COLOR = '#ffffff'
const BASE_WASH_OPACITY = 0.5

interface Props {
    data: RiskFeatureCollection
    selectedId: number | null
    onSelect: (id: number | null) => void
    /** Reports the hovered barangay id (or null on leave); fires only on change. */
    onHover: (id: number | null) => void
    /** Pixels reserved on the right for the detail panel (0 when closed). */
    panelWidth: number
    /** When true, barangay hover/click is inert (e.g. while editing POIs). */
    disabled?: boolean
}

/** First symbol (label) layer, so our fills sit under place names, not over them. */
const firstSymbolLayerId = (map: MapLibreMap): string | undefined =>
    map.getStyle().layers?.find((l) => l.type === 'symbol')?.id

const fitBox = (
    map: MapLibreMap,
    box: BBox,
    panelWidth: number,
    duration: number,
): void => {
    map.fitBounds(box as LngLatBoundsLike, {
        padding: { top: 64, bottom: 64, left: 64, right: 64 + panelWidth },
        maxZoom: 14,
        duration,
    })
}

const BarangayChoropleth = ({
    data,
    selectedId,
    onSelect,
    onHover,
    panelWidth,
    disabled = false,
}: Props) => {
    const { map, isLoaded } = useMap()
    const hoveredRef = useRef<number | null>(null)
    const didFitRef = useRef(false)
    // Keep the latest handlers reachable from the stable map listeners.
    const onSelectRef = useRef(onSelect)
    const onHoverRef = useRef(onHover)
    const disabledRef = useRef(disabled)
    useEffect(() => {
        onSelectRef.current = onSelect
        onHoverRef.current = onHover
    }, [onSelect, onHover])
    useEffect(() => {
        disabledRef.current = disabled
    }, [disabled])

    // Create source + layers once the style is ready.
    useEffect(() => {
        if (!map || !isLoaded) return
        const beforeId = firstSymbolLayerId(map)

        map.addSource(SOURCE, { type: 'geojson', data, promoteId: 'id' })

        // Wash the basemap so its roads/buildings recede behind the choropleth.
        // Sits below the fills (added next) but above every basemap layer, so it
        // fades the map detail without muddying the risk colours or the labels.
        map.addLayer(
            {
                id: BASE_WASH,
                type: 'background',
                paint: {
                    'background-color': BASE_WASH_COLOR,
                    'background-opacity': BASE_WASH_OPACITY,
                },
            },
            beforeId,
        )

        // Thinner than v1: the hazard-zone layer is now the primary hazard
        // geometry (rendered above this), so the choropleth reads as a lighter
        // administrative/orientation wash rather than competing for attention.
        map.addLayer(
            {
                id: FILL,
                type: 'fill',
                source: SOURCE,
                paint: { 'fill-color': fillColorExpression, 'fill-opacity': 0.35 },
            },
            beforeId,
        )
        // Darkens every barangay except the selected one (spotlight focus).
        map.addLayer(
            {
                id: DIM,
                type: 'fill',
                source: SOURCE,
                filter: ['!=', ['id'], NONE_ID],
                paint: { 'fill-color': '#0a0a0a', 'fill-opacity': 1 },
            },
            beforeId,
        )
        map.addLayer(
            {
                id: LINE,
                type: 'line',
                source: SOURCE,
                paint: {
                    'line-color': '#7f1d1d',
                    // Bolder strokes so the city's overall shape reads at a glance.
                    'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.5, 1.5],
                    'line-opacity': 0.5,
                },
            },
            beforeId,
        )
        map.addLayer(
            {
                id: OUTLINE,
                type: 'line',
                source: SOURCE,
                filter: ['==', ['id'], NONE_ID],
                paint: { 'line-color': '#7f1d1d', 'line-width': 2.5, 'line-opacity': 0.9 },
            },
            beforeId,
        )

        const handleClick = (e: MapLayerMouseEvent) => {
            if (disabledRef.current) return
            const hit = map.queryRenderedFeatures(e.point, { layers: [FILL] })[0] as
                | MapGeoJSONFeature
                | undefined
            onSelectRef.current(hit ? Number(hit.id) : null)
        }
        const setHover = (id: number | null) => {
            if (hoveredRef.current === id) return
            if (hoveredRef.current != null)
                map.setFeatureState({ source: SOURCE, id: hoveredRef.current }, { hover: false })
            hoveredRef.current = id
            if (id != null) map.setFeatureState({ source: SOURCE, id }, { hover: true })
            // Only fires on an actual change (guarded above), so the tooltip
            // re-renders per barangay, not per mouse-move pixel.
            onHoverRef.current(id)
        }
        const handleMove = (e: MapLayerMouseEvent) => {
            if (disabledRef.current) return
            map.getCanvas().style.cursor = 'pointer'
            setHover(e.features?.[0]?.id != null ? Number(e.features[0].id) : null)
        }
        const handleLeave = () => {
            map.getCanvas().style.cursor = ''
            setHover(null)
        }

        map.on('click', handleClick)
        map.on('mousemove', FILL, handleMove)
        map.on('mouseleave', FILL, handleLeave)

        return () => {
            map.off('click', handleClick)
            map.off('mousemove', FILL, handleMove)
            map.off('mouseleave', FILL, handleLeave)
            if (!map.style) return
            for (const id of [FILL, DIM, LINE, OUTLINE, BASE_WASH])
                if (map.getLayer(id)) map.removeLayer(id)
            if (map.getSource(SOURCE)) map.removeSource(SOURCE)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, isLoaded])

    // Push fresh joined data to the existing source (no layer churn).
    useEffect(() => {
        if (!map || !isLoaded) return
        const source = map.getSource(SOURCE) as GeoJSONSource | undefined
        source?.setData(data)
        if (!didFitRef.current) {
            const box = collectionBounds(data)
            if (box) {
                fitBox(map, box, panelWidth, 0)
                didFitRef.current = true
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, isLoaded, data])

    // React to selection: spotlight the barangay and frame it in the visible area.
    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer(DIM)) return
        const id = selectedId ?? NONE_ID
        map.setFilter(DIM, ['!=', ['id'], id])
        map.setPaintProperty(DIM, 'fill-opacity', selectedId != null ? 0.5 : 0)
        map.setFilter(OUTLINE, ['==', ['id'], id])

        if (selectedId != null) {
            const box = featureBoundsById(data, selectedId)
            if (box) fitBox(map, box, panelWidth, 800)
        } else if (didFitRef.current) {
            const box = collectionBounds(data)
            if (box) fitBox(map, box, panelWidth, 800)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, isLoaded, selectedId, panelWidth])

    // Editing turned on mid-hover: drop the highlight and reset the cursor.
    useEffect(() => {
        if (!map || !isLoaded || !disabled) return
        if (hoveredRef.current != null) {
            map.setFeatureState({ source: SOURCE, id: hoveredRef.current }, { hover: false })
            hoveredRef.current = null
            onHoverRef.current(null)
        }
        map.getCanvas().style.cursor = ''
    }, [disabled, map, isLoaded])

    return null
}

export default BarangayChoropleth
