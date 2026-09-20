/** Admin Settings groups. Each maps to one `admin/settings/<group>/` singleton
 * endpoint (mirrors the backend SingletonSerializer for that group). */

export type SettingsGroup =
    | 'retention'
    | 'organization'
    | 'toggles'
    | 'registration'

export interface RetentionPolicy {
    rainfall_retention_days: number
    risk_score_retention_days: number
    flood_event_purge_grace_hours: number
    updated_at: string
}

export interface OrganizationSettings {
    org_name: string
    system_title: string
    contact_number: string
    updated_at: string
}

export interface OperationalToggles {
    maintenance_mode: boolean
    announcement_banner: string
    updated_at: string
}

export interface RegistrationPolicy {
    self_registration_enabled: boolean
    otp_ttl_minutes: number
    terms_version: string
    updated_at: string
}

/** Maps each group to its settings payload type. */
export interface SettingsByGroup {
    retention: RetentionPolicy
    organization: OrganizationSettings
    toggles: OperationalToggles
    registration: RegistrationPolicy
}
