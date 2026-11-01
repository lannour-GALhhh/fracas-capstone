import { useEffect, useMemo } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMap } from '@/common/ui/map'
import { useRadiusEvacuations } from '../hooks/useRadiusEvacuations'
import type { RadiusEvacuation } from '../types/radius'
import { circlePolygon } from '../utils/circle'

const SOURCE = 'radius-evacuations'
const FILL = 'radius-evacuations-fill'
const LINE = 'radius-evacuations-line'
const COLOR = '#dc2626'

export interface RadiusDraft {
    lng: number
    lat: number
    radiusM: number
}

interface Props {
    visible: boolean
    /** Circle being placed, previewed with a dashed outline. */
    draft?: RadiusDraft | null
}

/** Active point + radius evacuations (solid red) and the circle being placed (dashed). */
const RadiusEvacuationLayer = ({ visible, draft = null }: Props) => {
    const { map, isLoaded } = useMap()
    const { data } = useRadiusEvacuations()

    const collection = useMemo(
        () => ({
            type: 'FeatureCollection' as const,
            features: [
                ...(data ?? []).map((e: RadiusEvacuation) => ({
                    type: 'Feature' as const,
                    properties: { draft: false },
                    geometry: circlePolygon(e.center.lng, e.center.lat, e.radius_m),
                })),
                ...(draft
                    ? [
                          {
                              type: 'Feature' as const,
                              properties: { draft: true },
                              geometry: circlePolygon(draft.lng, draft.lat, draft.radiusM),
                          },
                      ]
                    : []),
            ],
        }),
        [data, draft],
    )

    useEffect(() => {
        if (!map || !isLoaded) return
        const beforeId = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id
        map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer(
            {
                id: FILL,
                type: 'fill',
                source: SOURCE,
                paint: {
                    'fill-color': COLOR,
                    'fill-opacity': ['case', ['get', 'draft'], 0.12, 0.28],
                },
            },
            beforeId,
        )
        map.addLayer(
            {
                id: LINE,
                type: 'line',
                source: SOURCE,
                paint: { 'line-color': COLOR, 'line-width': 2 },
                filter: ['!', ['get', 'draft']],
            },
            beforeId,
        )
        map.addLayer(
            {
                id: `${LINE}-draft`,
                type: 'line',
                source: SOURCE,
                paint: { 'line-color': COLOR, 'line-width': 2, 'line-dasharray': [2, 2] },
                filter: ['get', 'draft'],
            },
            beforeId,
        )
        return () => {
            if (!map.getStyle()) return
            for (const id of [`${LINE}-draft`, LINE, FILL]) if (map.getLayer(id)) map.removeLayer(id)
            if (map.getSource(SOURCE)) map.removeSource(SOURCE)
        }
    }, [map, isLoaded])

    useEffect(() => {
        if (!map || !isLoaded) return
        ;(map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(collection as never)
    }, [map, isLoaded, collection])

    useEffect(() => {
        if (!map || !isLoaded) return
        for (const id of [FILL, LINE, `${LINE}-draft`])
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible || draft ? 'visible' : 'none')
    }, [map, isLoaded, visible, draft])

    return null
}

export default RadiusEvacuationLayer
