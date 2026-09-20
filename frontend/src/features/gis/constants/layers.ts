import { Circle, CloudRain, Tent, TriangleAlert } from 'lucide-react'
import { SUSCEPTIBILITY_COLORS } from '@/features/gis/constants/susceptibility'
import type { SusceptibilityLevel } from '../types/api'

export interface LayerVisibility {
    hazard: boolean
    evacuation: boolean
    rainfall: boolean
    very_low: boolean
    low: boolean
    moderate: boolean
    high: boolean
    very_high: boolean
}

export type LayerKey = keyof LayerVisibility

/** Layer toggles for the hazard-zone susceptibility levels, least → most severe. */
export const SUSCEPTIBILITY_LAYER_KEYS: SusceptibilityLevel[] = [
    'very_low',
    'low',
    'moderate',
    'high',
    'very_high',
]

/** Shared map-layer metadata, consumed by the toggles and the Legend card. */
export const LAYERS: { key: LayerKey; label: string; icon: typeof TriangleAlert; color: string }[] = [
    { key: 'hazard', label: 'Flood hazard zones', icon: TriangleAlert, color: '#d73027' },
    { key: 'evacuation', label: 'Evacuation centers', icon: Tent, color: '#059669' },
    { key: 'rainfall', label: 'Rainfall intensity', icon: CloudRain, color: '#7c3aed' },
    { key: 'very_low', label: 'Very low susceptibility', icon: Circle, color: SUSCEPTIBILITY_COLORS.very_low },
    { key: 'low', label: 'Low susceptibility', icon: Circle, color: SUSCEPTIBILITY_COLORS.low },
    { key: 'moderate', label: 'Moderate susceptibility', icon: Circle, color: SUSCEPTIBILITY_COLORS.moderate },
    { key: 'high', label: 'High susceptibility', icon: Circle, color: SUSCEPTIBILITY_COLORS.high },
    { key: 'very_high', label: 'Very high susceptibility', icon: Circle, color: SUSCEPTIBILITY_COLORS.very_high },
]
