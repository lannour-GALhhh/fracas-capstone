import type {
    FloodSeverity,
    FloodSourceKind,
    FloodSourceType,
} from '../types/api'

/** How an event entered the system. */
export const SOURCE_KIND_LABELS: Record<FloodSourceKind, string> = {
    manual: 'Manual',
    auto: 'Auto-detected',
}

/** Who reported the event. */
export const SOURCE_TYPE_LABELS: Record<FloodSourceType, string> = {
    operator: 'Operator',
    third_party: '3rd-party report',
}

/** Human labels for each severity level. */
export const SEVERITY_LABELS: Record<FloodSeverity, string> = {
    minor: 'Minor',
    moderate: 'Moderate',
    major: 'Major',
}

/** White → red severity ramp, echoing the risk map's convention. */
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

/** Human labels for the audit-trail action verbs. */
export const CHANGE_ACTION_LABELS: Record<string, string> = {
    created: 'Created',
    updated: 'Edited',
    confirmed: 'Confirmed',
    resolved: 'Resolved',
    deleted: 'Deleted',
    restored: 'Restored',
}

/** Human labels for the audited fields (mirrors the backend TRACKED_FIELDS). */
export const CHANGE_FIELD_LABELS: Record<string, string> = {
    barangay: 'Barangay',
    occurred_at: 'Occurred at',
    ended_at: 'Ended at',
    severity: 'Severity',
    water_depth_m: 'Flood depth',
    summary: 'Summary',
    people_affected: 'People affected',
    people_evacuated: 'People evacuated',
    source_type: 'Source type',
    reported_by: 'Reported by',
    source: 'Source',
    notes: 'Notes',
}
