/** Admin settings groups, each mapped to one singleton endpoint. */

export type SettingsGroup =
    | 'retention'
    | 'organization'
    | 'toggles'
    | 'registration'
    | 'rainfall'

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

export type WeatherModel = 'default' | 'ecmwf_ifs025'

export interface RainfallSettings {
    weather_model: WeatherModel
    updated_at: string
}

/** How well barangays dedup into Open-Meteo cells, and today's usage of the daily call cap. */
export interface RainfallGridStatus {
    barangays: number
    mapped: number
    cells: number
    expected_daily_calls: number
    calls_today: number
    daily_limit: number
    has_retry_headroom: boolean
    /** Only on the re-map response: barangays that could not be mapped. */
    failed?: string[]
}

/** Maps each group to its settings payload type. */
export interface SettingsByGroup {
    retention: RetentionPolicy
    organization: OrganizationSettings
    toggles: OperationalToggles
    registration: RegistrationPolicy
    rainfall: RainfallSettings
}
