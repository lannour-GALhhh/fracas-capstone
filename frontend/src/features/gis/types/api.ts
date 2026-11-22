import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson'

/** Danger levels, most-severe first is defined in constants/risk.ts. */
export type RiskCategory = 'low' | 'medium' | 'high' | 'critical'

/** One entry from GET /api/risk/snapshot/ (`barangays[]`). */
export interface RiskSnapshotEntry {
    id: number
    name: string
    score: number
    category: RiskCategory
    is_degraded: boolean
    /** Latest reading, mm/hr — null when there's no fresh rainfall for this cycle. */
    current_rainfall: number | null
    /** [current, +15min … +240min] anchored on `rainfall_recorded_at` (see currentFromSeries). */
    rainfall_series?: (number | null)[] | null
    rainfall_recorded_at?: string | null
}

/** GET /api/risk/snapshot/ — all barangays for the current cycle. */
export interface RiskSnapshot {
    computed_at: string | null
    count: number
    barangays: RiskSnapshotEntry[]
}

/** One factor's contribution inside a barangay's `breakdown` (explainability). */
export interface RiskFactorBreakdown {
    value: number // 0..1 hazard contribution
    raw_weight: number
    available: boolean
    detail: Record<string, unknown>
}

/** A susceptibility level's share of a barangay's total zoned area. */
export interface SusceptibilityLevelShare {
    area_sqm: number
    share: number // 0..1
}

/** Shape of `RiskFactorBreakdown['detail']` for the `susceptibility` factor. */
export interface SusceptibilityDetail {
    dominant_level: SusceptibilityLevel
    zone_count: number
    levels?: Partial<Record<SusceptibilityLevel, SusceptibilityLevelShare>>
}

/** One susceptibility zone's *computed* localized risk (rainfall × susceptibility). */
export interface ZoneScore {
    level: SusceptibilityLevel
    susceptibility: number // 0..1 static hazard-map value
    share: number // 0..1 area share of the barangay
    hazard: number // 0..1 zone hazard this cycle
    score: number // 0..100
    category: RiskCategory
}

/** GET /api/risk/barangays/:id/ — full detail for the side panel. */
export interface BarangayRisk {
    id: number
    name: string
    status: RiskCategory | null
    risk_score: number | null
    /** Barangay headline number — mean of its zone scores (== risk_score). */
    average: number | null
    /** Per-zone localized scores (rainfall-gated model). */
    zones: ZoneScore[]
    is_degraded: boolean | null
    breakdown: Record<string, RiskFactorBreakdown> | null
    computed_at: string | null
    current_rainfall: number | null
    rainfall_forecast_15min: number | null
    rainfall_forecast_30min: number | null
    rainfall_forecast_45min: number | null
    rainfall_forecast_60min: number | null
    rainfall_forecast_75min: number | null
    rainfall_forecast_90min: number | null
    rainfall_forecast_105min: number | null
    rainfall_forecast_120min: number | null
    rainfall_forecast_135min: number | null
    rainfall_forecast_150min: number | null
    rainfall_forecast_165min: number | null
    rainfall_forecast_180min: number | null
    rainfall_forecast_195min: number | null
    rainfall_forecast_210min: number | null
    rainfall_forecast_225min: number | null
    rainfall_forecast_240min: number | null
    /** Last completed clock hour, mm/hr; hourly_forecast_Nhr is the hour N after it. */
    hourly_current: number | null
    hourly_forecast_1hr: number | null
    hourly_forecast_2hr: number | null
    hourly_forecast_3hr: number | null
    hourly_forecast_4hr: number | null
    /** Chance of rain (%) for hourly_current's hour and the five after it; entries may be null. */
    precipitation_probability?: (number | null)[] | null
    accumulated_24hr: number | null
    accumulated_7day: number | null
    rainfall_rate_change: number | null
    recorded_at: string | null
}

/** Flood-susceptibility level, most-severe last — see constants/susceptibility.ts. */
export type SusceptibilityLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high'

/** One row from GET /api/high-risk-streets/?barangay=<id>. */
export interface HighRiskStreet {
    id: number
    name: string
    barangay: number
    barangay_name: string
    susceptibility_level: SusceptibilityLevel
}

/** One bucket's rainfall record from GET /api/rainfall/history/?barangay=<id>. */
export interface RainfallHistoryPoint {
    /** ISO datetime (hour granularity) or date-only string (day granularity). */
    recorded_at: string
    peak_mm_hr: number
    accumulated_mm: number
}

/** One entry from GET /api/risk/zones/snapshot/ — a barangay×level's computed risk. */
export interface ZoneRiskEntry {
    barangay_id: number
    level: SusceptibilityLevel
    score: number
    category: RiskCategory
}

/** GET /api/risk/zones/snapshot/ — latest per-zone risk for the hazard-zone layer. */
export interface ZoneRiskSnapshot {
    computed_at: string | null
    count: number
    zones: ZoneRiskEntry[]
}

/** Properties on each feature from GET /api/barangays/hazard-zones/. */
export interface HazardZoneProperties {
    id: number
    barangay: number
    level: SusceptibilityLevel
    category?: RiskCategory | null
    score?: number | null
}

/** GET /api/barangays/hazard-zones/ — simplified susceptibility zone geometry for the map. */
export type HazardZoneCollection = FeatureCollection<Polygon | MultiPolygon, HazardZoneProperties>

/** Static properties on each barangay feature from GET /api/barangays/. */
export interface BarangayBaseProperties {
    id: number
    name: string
    code: string
    area_square_km: number
    /** Residents subscribed to this barangay's alerts (annotated server-side). */
    subscriber_count: number
}

/** Properties after joining the risk snapshot onto the geometry (client-side). */
export interface BarangayRiskProperties extends BarangayBaseProperties {
    category: RiskCategory | null
    score: number | null
    is_degraded: boolean
    current_rainfall: number | null
}

export type BarangayGeometry = Polygon | MultiPolygon
export type BarangayFeatureCollection = FeatureCollection<BarangayGeometry, BarangayBaseProperties>
export type RiskFeatureCollection = FeatureCollection<BarangayGeometry, BarangayRiskProperties>

/** PAGASA rainfall-warning band of a forecast hour. */
export type ForecastBand = 'none' | 'yellow' | 'orange' | 'red'

export interface ForecastHour {
    /** Start of the hour (ISO, UTC). */
    start: string
    /** Hours from now (up to 11 PM tomorrow, local). Hours 1-4 are covered by the risk score. */
    lead_hours: number
    mm_hr: number
    probability: number | null
    band: ForecastBand
}

/** GET /api/rainfall/forecast/ — display-only 24 h outlook, never a hazard score. */
export interface RainfallForecast {
    barangay: number
    name: string
    generated_at: string
    warning_hours: number
    hours: ForecastHour[]
    summary: {
        first_heavy: ForecastHour | null
        peak: ForecastHour | null
        total_mm: number
    }
}
