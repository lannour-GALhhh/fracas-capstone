import { Map, MapControls, useMap } from '@/common/ui/map'
import { Card } from '@/common/ui/card'
import { useEffect } from 'react';
import type { FeatureCollection } from 'geojson';
import type { MapLayerMouseEvent } from 'maplibre-gl';

interface GISMapProps {
  data: FeatureCollection,
  onFeatureClick?: (id: string, properties: Record<string, unknown>) => void
}

const BarangayLayers = ({data, onFeatureClick}: GISMapProps) => {

  	const { map } = useMap();

  	useEffect(() => {
		if (!map) return;

		const handleClick = (e: MapLayerMouseEvent) => {
			const feature = e.features?.[0];
			if (feature) onFeatureClick?.(String(feature.id), feature.properties);
		}
		const handleMouseEnter = () => { map.getCanvas().style.cursor = 'pointer'}
		const handleMouseLeave = () => { map.getCanvas().style.cursor = ''}

		const onLoad = () => {
			map.addSource('barangays', { type: 'geojson', data, promoteId: 'id'});
			
			map.addLayer({ id: 'barangay-fill', type: 'fill', source: 'barangays', paint: {"fill-color": '#3b82f6', 'fill-opacity': 0.05}})
			map.addLayer({ id: 'barangay-line', type: 'line', source: 'barangays', paint: {"line-color": '#3b82f6', 'line-width': 1, 'line-opacity': 0.10}})

			map.on('click', 'barangay-fill', handleClick);
			map.on('mouseenter', 'barangay-fill', handleMouseEnter);
			map.on('mouseleave', 'barangay-fill', handleMouseLeave);
		}

		if (map.isStyleLoaded()) onLoad()
		else map.once('load', onLoad)

		return () => {
			map.off('load', onLoad);
			map.off('click', 'barangay-fill', handleClick);
			map.off('mouseenter', 'barangay-fill', handleMouseEnter);
			map.off('mouseleave', 'barangay-fill', handleMouseLeave);

			if (map.getLayer('barangay-fill')) map.removeLayer('barangay-fill');
			if (map.getLayer('barangay-line')) map.removeLayer('barangay-line');
			if (map.getSource('barangays')) map.removeSource('barangays');

		}
		}, [map, data, onFeatureClick])

	return null;
}

const GISMap = ({data, onFeatureClick}: GISMapProps) => {
  return (
    <Card className='h-full p-0 overflow-hidden'>
      <Map center={[122.07, 6.92]} zoom={11} theme='light' >
        <MapControls position='bottom-left' showFullscreen={true} />
		<BarangayLayers data={data} onFeatureClick={onFeatureClick} />
      </Map>
    </Card>
  )
}

export default GISMap