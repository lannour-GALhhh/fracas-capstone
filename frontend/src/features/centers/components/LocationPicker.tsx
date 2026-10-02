import { useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { Map, MapControls, MapMarker, MarkerContent, useMap } from '@/common/ui/map'

// Zamboanga City — where the map opens before a pin exists.
const DEFAULT_CENTER: [number, number] = [122.07, 6.92]

interface Props {
    latitude: string
    longitude: string
    onChange: (lat: number, lng: number) => void
}

/** Click-to-place + drag handler, and re-centers when the coordinates are typed in. */
const PinInteraction = ({ latitude, longitude, onChange }: Props) => {
    const { map, isLoaded } = useMap()

    useEffect(() => {
        if (!map || !isLoaded) return
        const handler = (e: { lngLat: { lat: number; lng: number } }) =>
            onChange(e.lngLat.lat, e.lngLat.lng)
        map.on('click', handler)
        return () => {
            map.off('click', handler)
        }
    }, [map, isLoaded, onChange])

    const lat = Number(latitude)
    const lng = Number(longitude)
    const valid = latitude !== '' && longitude !== '' && !Number.isNaN(lat) && !Number.isNaN(lng)

    // Follow typed coordinates (and the initial value) without fighting a drag in progress.
    useEffect(() => {
        if (!map || !isLoaded || !valid) return
        if (!map.getBounds().contains([lng, lat])) map.easeTo({ center: [lng, lat], duration: 400 })
    }, [map, isLoaded, valid, lat, lng])

    if (!valid) return null
    return (
        <MapMarker
            longitude={lng}
            latitude={lat}
            draggable
            onDragEnd={({ lng: x, lat: y }) => onChange(y, x)}
        >
            <MarkerContent>
                <MapPin className='size-8 fill-red-600 text-white drop-shadow' />
            </MarkerContent>
        </MapMarker>
    )
}

/** Small map for dropping or dragging the center's pin. */
const LocationPicker = (props: Props) => {
    const lat = Number(props.latitude)
    const lng = Number(props.longitude)
    const hasPin = props.latitude !== '' && props.longitude !== '' && !isNaN(lat) && !isNaN(lng)
    return (
        <div className='h-64 overflow-hidden rounded-md border sm:h-full sm:min-h-64'>
            <Map center={hasPin ? [lng, lat] : DEFAULT_CENTER} zoom={hasPin ? 15 : 11} theme='light'>
                <MapControls position='bottom-right' />
                <PinInteraction {...props} />
            </Map>
        </div>
    )
}

export default LocationPicker
