import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { Feature, Point } from 'geojson'
import SidePanel from '../component/SidePanel'
import { useEvacuationCenters, useEvacuationMutations, useHotspots, useHotspotMutations } from './usePoi'
import HotspotPopupForm, { type HotspotFormValues } from './HotspotPopupForm'
import CenterPopupForm, { type CenterFormValues } from './CenterPopupForm'
import { DEFAULT_HOTSPOT_RADIUS } from './HotspotLayer'
import type { EvacuationProperties, HotspotProperties } from './types'
import type { PoiEditor } from './usePoiEditor'

/** Parse the radius field, falling back to the default while it's empty/invalid. */
const parseRadius = (s: string): number => {
    const n = Number(s)
    return s === '' || Number.isNaN(n) || n <= 0 ? DEFAULT_HOTSPOT_RADIUS : n
}

const PanelHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
    <div className='flex items-start justify-between'>
        <h2 className='text-lg font-medium'>{title}</h2>
        <button
            type='button'
            onClick={onClose}
            aria-label='Close editor'
            className='text-muted-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md transition-colors'
        >
            <X className='size-4' />
        </button>
    </div>
)

/** Edit / create form for a flood hotspot, wired to the map preview + mutations. */
const HotspotBody = ({ editor }: { editor: PoiEditor }) => {
    const id = editor.active?.id ?? null
    const { data } = useHotspots()
    const { create, update, remove } = useHotspotMutations()

    const feature =
        id != null
            ? ((data?.features ?? []) as Feature<Point, HotspotProperties>[]).find(
                  (f) => f.properties.id === id,
              )
            : undefined
    const p = feature?.properties

    const initial: HotspotFormValues = {
        name: p?.name ?? '',
        severity: p?.severity ?? 'medium',
        radius_m: p ? String(p.radius_m) : String(DEFAULT_HOTSPOT_RADIUS),
        description: p?.description ?? '',
        is_active: p?.is_active ?? true,
    }

    // Seed the live circle with the opening values (esp. for existing hotspots).
    useEffect(() => {
        editor.setPreview({ radius_m: parseRadius(initial.radius_m), severity: initial.severity })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const saving = create.isPending || update.isPending || remove.isPending

    const handleSubmit = (v: HotspotFormValues) => {
        const payload = {
            name: v.name.trim(),
            severity: v.severity,
            radius_m: v.radius_m === '' ? undefined : Number(v.radius_m),
            description: v.description.trim(),
            is_active: v.is_active,
        }
        if (id == null) {
            if (!editor.draft) return
            create.mutate(
                { ...payload, latitude: editor.draft.lat, longitude: editor.draft.lng },
                { onSuccess: editor.close },
            )
        } else {
            update.mutate({ id, payload }, { onSuccess: editor.close })
        }
    }

    return (
        <>
            <PanelHeader
                title={id == null ? 'New flood hotspot' : 'Edit flood hotspot'}
                onClose={editor.close}
            />
            {id == null && (
                <p className='text-muted-foreground text-xs'>
                    Drag the marker on the map to position it, then fill in the details.
                </p>
            )}
            <HotspotPopupForm
                initial={initial}
                saving={saving}
                onChange={(v) =>
                    editor.setPreview({ radius_m: parseRadius(v.radius_m), severity: v.severity })
                }
                onSubmit={handleSubmit}
                onCancel={editor.close}
                onDelete={id != null ? () => remove.mutate(id, { onSuccess: editor.close }) : undefined}
            />
        </>
    )
}

/** Edit / create form for an evacuation center. */
const CenterBody = ({ editor }: { editor: PoiEditor }) => {
    const id = editor.active?.id ?? null
    const { data } = useEvacuationCenters()
    const { create, update, remove } = useEvacuationMutations()

    const feature =
        id != null
            ? ((data?.features ?? []) as Feature<Point, EvacuationProperties>[]).find(
                  (f) => f.properties.id === id,
              )
            : undefined
    const p = feature?.properties

    const initial: CenterFormValues = {
        name: p?.name ?? '',
        capacity: p?.capacity != null ? String(p.capacity) : '',
        contact: p?.contact ?? '',
        is_active: p?.is_active ?? true,
    }

    const saving = create.isPending || update.isPending || remove.isPending

    const handleSubmit = (v: CenterFormValues) => {
        const payload = {
            name: v.name.trim(),
            capacity: v.capacity === '' ? null : Number(v.capacity),
            contact: v.contact.trim(),
            is_active: v.is_active,
        }
        if (id == null) {
            if (!editor.draft) return
            create.mutate(
                { ...payload, latitude: editor.draft.lat, longitude: editor.draft.lng },
                { onSuccess: editor.close },
            )
        } else {
            update.mutate({ id, payload }, { onSuccess: editor.close })
        }
    }

    return (
        <>
            <PanelHeader
                title={id == null ? 'New evacuation center' : 'Edit evacuation center'}
                onClose={editor.close}
            />
            {id == null && (
                <p className='text-muted-foreground text-xs'>
                    Drag the marker on the map to position it, then fill in the details.
                </p>
            )}
            <CenterPopupForm
                initial={initial}
                saving={saving}
                onSubmit={handleSubmit}
                onCancel={editor.close}
                onDelete={id != null ? () => remove.mutate(id, { onSuccess: editor.close }) : undefined}
            />
        </>
    )
}

/**
 * The docked editor for whichever POI is active. Remounted per selection (keyed
 * by kind + id) so the underlying form re-seeds from the newly selected feature.
 */
const PoiEditPanel = ({ editor }: { editor: PoiEditor }) => {
    const active = editor.active
    if (!active) return null

    const key = `${active.kind}-${active.id ?? 'new'}`
    return (
        <SidePanel>
            {active.kind === 'hotspot' ? (
                <HotspotBody key={key} editor={editor} />
            ) : (
                <CenterBody key={key} editor={editor} />
            )}
        </SidePanel>
    )
}

export default PoiEditPanel
