import { useCallback, useState } from 'react'
import type { HotspotSeverity } from './types'

export type PoiKind = 'hotspot' | 'evacuation'

/** The POI open in the edit panel. `id === null` means a new one being placed. */
export interface ActivePoi {
    kind: PoiKind
    id: number | null
}

/** Working position of a not-yet-saved POI, moved by dragging its marker. */
export interface PoiDraft {
    lng: number
    lat: number
}

/** Live values the hotspot form feeds back so the map circle can track edits. */
export interface HotspotPreview {
    radius_m: number
    severity: HotspotSeverity
}

export interface PoiEditor {
    editMode: boolean
    active: ActivePoi | null
    draft: PoiDraft | null
    preview: HotspotPreview | null
    toggleEdit: () => void
    /** Begin placing a new POI at the given position. */
    startCreate: (kind: PoiKind, at: PoiDraft) => void
    /** Open an existing POI in the edit panel. */
    selectExisting: (kind: PoiKind, id: number) => void
    moveDraft: (at: PoiDraft) => void
    setPreview: (p: HotspotPreview | null) => void
    /** Close the panel but stay in edit mode. */
    close: () => void
}

/**
 * Shared editing state for map POIs. The map layers report clicks/drags into it
 * and the right-hand panel drives the actual form + mutations, so a marker and
 * its editor stay in sync without prop-drilling through the map tree.
 */
export function usePoiEditor(): PoiEditor {
    const [editMode, setEditMode] = useState(false)
    const [active, setActive] = useState<ActivePoi | null>(null)
    const [draft, setDraft] = useState<PoiDraft | null>(null)
    const [preview, setPreview] = useState<HotspotPreview | null>(null)

    const close = useCallback(() => {
        setActive(null)
        setDraft(null)
        setPreview(null)
    }, [])

    const toggleEdit = useCallback(() => {
        setEditMode((on) => {
            if (on) close()
            return !on
        })
    }, [close])

    const startCreate = useCallback((kind: PoiKind, at: PoiDraft) => {
        setActive({ kind, id: null })
        setDraft(at)
        setPreview(null)
    }, [])

    const selectExisting = useCallback((kind: PoiKind, id: number) => {
        setActive({ kind, id })
        setDraft(null)
        setPreview(null)
    }, [])

    const moveDraft = useCallback((at: PoiDraft) => setDraft(at), [])

    return {
        editMode,
        active,
        draft,
        preview,
        toggleEdit,
        startCreate,
        selectExisting,
        moveDraft,
        setPreview,
        close,
    }
}
