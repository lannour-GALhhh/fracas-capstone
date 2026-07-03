import type { FloodSeverity } from '../types/api'

/** Human labels for each severity level. */
export const SEVERITY_LABELS: Record<FloodSeverity, string> = {
    minor: 'Minor',
    moderate: 'Moderate',
    major: 'Major',
}

/**
 * White → red intensity ramp for severity, echoing the risk map's convention
 * (calm near-white → deep red for the worst). Single source of truth for the
 * table badge/dot and the detail header.
 */
export const SEVERITY_COLORS: Record<FloodSeverity, string> = {
    minor: '#f2a1a1',
    moderate: '#dd4b4b',
    major: '#b01212',
}

/** Filter options, mildest → worst. */
export const SEVERITY_FILTERS: { value: FloodSeverity; label: string }[] = [
    { value: 'minor', label: SEVERITY_LABELS.minor },
    { value: 'moderate', label: SEVERITY_LABELS.moderate },
    { value: 'major', label: SEVERITY_LABELS.major },
]
