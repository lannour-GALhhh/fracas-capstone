import { Circle, Tent, TriangleAlert } from 'lucide-react'
import {SUSCEPTIBILITY_COLORS} from '@/features/gis/constants/susceptibility'

export interface LayerVisibility {
    hazard: boolean
    evacuation: boolean
    low: boolean
    moderate: boolean
    high: boolean
    very_high: boolean
}

export type LayerKey = keyof LayerVisibility

/** Shared map-layer metadata, consumed by the toggles and the Legend card. */
export const LAYERS: { key: LayerKey; label: string; icon: typeof TriangleAlert; color: string }[] = [
    { key: 'hazard', label: 'Flood hazard zones', icon: TriangleAlert, color: '#d73027' },
    { key: 'evacuation', label: 'Evacuation centers', icon: Tent, color: '#059669' },
    { key: 'low', label: 'Low risk zones', icon: Circle, color: SUSCEPTIBILITY_COLORS.low},
    { key: 'moderate', label: 'Moderate risk zones', icon: Circle, color: SUSCEPTIBILITY_COLORS.moderate},
    { key: 'high', label: 'High risk zones', icon: Circle, color: SUSCEPTIBILITY_COLORS.high},
    { key: 'very_high', label: 'Very High risk zones', icon: Circle, color: SUSCEPTIBILITY_COLORS.very_high},
]
