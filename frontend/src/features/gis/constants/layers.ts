import { Tent, TriangleAlert } from 'lucide-react'

export interface LayerVisibility {
    hazard: boolean
    evacuation: boolean
}

export type LayerKey = keyof LayerVisibility

/** Shared map-layer metadata, consumed by the toggles and the Legend card. */
export const LAYERS: { key: LayerKey; label: string; icon: typeof TriangleAlert; color: string }[] = [
    { key: 'hazard', label: 'Flood hazard zones', icon: TriangleAlert, color: '#d73027' },
    { key: 'evacuation', label: 'Evacuation centers', icon: Tent, color: '#059669' },
]
