import { forwardRef, useImperativeHandle } from 'react'
import type { Feature, Point } from 'geojson'
import { Tent } from 'lucide-react'
import { MapMarker, MarkerContent, MarkerPopup, useMap } from '@/common/ui/map'
import { Badge } from '@/common/ui/badge'
import { useEvacuationCenters, useEvacuationMutations } from './usePoi'
import type { EvacuationProperties, PoiLayerHandle } from './types'
import type { PoiEditor } from './usePoiEditor'

interface Props {
    /** Layer toggle. When off, only centers inside the focused barangay show. */
    visible: boolean
    editor: PoiEditor
    focusedBarangayId: number | null
}

const Pin = ({
    tone,
    active,
}: {
    tone: 'active' | 'inactive' | 'draft'
    active?: boolean
}) => {
    const color =
        tone === 'draft' ? 'bg-amber-500' : tone === 'inactive' ? 'bg-slate-400' : 'bg-emerald-600'
    return (
        <div
            className={`flex size-7 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform ${color} ${
                active ? 'scale-125 ring-2 ring-sky-500 ring-offset-2' : ''
            }`}
        >
            <Tent className='size-4 text-white' />
        </div>
    )
}

const ReadOnlyDetails = ({ p }: { p: EvacuationProperties }) => (
    <div className='flex w-48 flex-col gap-1'>
        <div className='flex items-center justify-between gap-2'>
            <span className='font-medium'>{p.name}</span>
            {!p.is_active && <Badge variant='secondary'>Inactive</Badge>}
        </div>
        {p.barangay_name && <span className='text-muted-foreground text-xs'>{p.barangay_name}</span>}
        <div className='text-xs'>
            {p.capacity != null && <div>Capacity: {p.capacity.toLocaleString()}</div>}
            {p.contact && <div>Contact: {p.contact}</div>}
        </div>
    </div>
)

type EvacFeature = Feature<Point, EvacuationProperties>

const EvacuationLayer = forwardRef<PoiLayerHandle, Props>(function EvacuationLayer(
    { visible, editor, focusedBarangayId },
    ref,
) {
    const { map } = useMap()
    const { data } = useEvacuationCenters()
    const { update } = useEvacuationMutations()
    const editMode = editor.editMode

    useImperativeHandle(
        ref,
        () => ({
            startAdd: () => {
                if (!map) return
                const c = map.getCenter()
                editor.startCreate('evacuation', { lng: c.lng, lat: c.lat })
            },
        }),
        [map, editor],
    )

    const effectiveVisible = visible || editMode
    const features = (data?.features ?? []) as EvacFeature[]
    const shown = effectiveVisible
        ? features
        : features.filter((f) => f.properties.barangay === focusedBarangayId)

    const activeId = editor.active?.kind === 'evacuation' ? editor.active.id : undefined
    const drafting = editor.active?.kind === 'evacuation' && editor.active.id === null

    return (
        <>
            {shown.map((f) => {
                const [lng, lat] = f.geometry.coordinates
                const p = f.properties
                const isActive = activeId != null && p.id === activeId
                return (
                    <MapMarker
                        key={p.id}
                        longitude={lng}
                        latitude={lat}
                        draggable={editMode}
                        onClick={() => editMode && editor.selectExisting('evacuation', p.id)}
                        onDragEnd={({ lng, lat }) =>
                            update.mutate({ id: p.id, payload: { latitude: lat, longitude: lng } })
                        }
                    >
                        <MarkerContent>
                            <Pin tone={p.is_active ? 'active' : 'inactive'} active={isActive} />
                        </MarkerContent>
                        {!editMode && (
                            <MarkerPopup closeButton>
                                <ReadOnlyDetails p={p} />
                            </MarkerPopup>
                        )}
                    </MapMarker>
                )
            })}

            {drafting && editor.draft && (
                <MapMarker
                    longitude={editor.draft.lng}
                    latitude={editor.draft.lat}
                    draggable
                    onDragEnd={({ lng, lat }) => editor.moveDraft({ lng, lat })}
                >
                    <MarkerContent>
                        <Pin tone='draft' active />
                    </MarkerContent>
                </MapMarker>
            )}
        </>
    )
})

export default EvacuationLayer
