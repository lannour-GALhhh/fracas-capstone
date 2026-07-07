import { Droplets, Tent, TriangleAlert } from 'lucide-react'

export interface LayerVisibility {
    dam: boolean
    evacuation: boolean
    hotspot: boolean
}

export type LayerKey = keyof LayerVisibility

/** Shared map-layer metadata, consumed by the toggles and the Legend card. */
export const LAYERS: { key: LayerKey; label: string; icon: typeof Droplets; color: string }[] = [
    { key: 'dam', label: 'Dam & river', icon: Droplets, color: '#2563eb' },
    { key: 'evacuation', label: 'Evacuation centers', icon: Tent, color: '#059669' },
    { key: 'hotspot', label: 'Flood hotspots', icon: TriangleAlert, color: '#f97316' },
]
