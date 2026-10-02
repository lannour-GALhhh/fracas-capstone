import { useEffect } from 'react'
import { useMap } from '@/common/ui/map'
import { useEvacuationCenters } from './usePoi'

/** Flies the map to one evacuation center (e.g. from "Show in Map"). Renders nothing. */
const FocusCenter = ({ centerId }: { centerId: number | null }) => {
    const { map, isLoaded } = useMap()
    const { data } = useEvacuationCenters()

    useEffect(() => {
        if (!map || !isLoaded || centerId == null) return
        const f = data?.features.find((x) => x.properties.id === centerId)
        if (!f) return
        const [lng, lat] = f.geometry.coordinates
        map.flyTo({ center: [lng, lat], zoom: 16, duration: 1200 })
    }, [map, isLoaded, data, centerId])

    return null
}

export default FocusCenter
