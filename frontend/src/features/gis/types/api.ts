import type { FeatureCollection, Polygon, MultiPolygon, Point, MultiLineString } from 'geojson'

/** Danger levels, most-severe first is defined in constants/risk.ts. */
export type RiskCategory = 'low' | 'medium' | 'high' | 'critical'

/** One entry from GET /api/risk/snapshot/ (`barangays[]`). */
export interface RiskSnapshotEntry {
    id: number
    name: string
    score: number
    category: RiskCategory
    is_degraded: boolean
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

/** GET /api/risk/barangays/:id/ — full detail for the side panel. */
export interface BarangayRisk {
    id: number
    name: string
    status: RiskCategory | null
    risk_score: number | null
    is_degraded: boolean | null
    breakdown: Record<string, RiskFactorBreakdown> | null
    computed_at: string | null
    current_rainfall: number | null
    rainfall_forecast_1hr: number | null
    rainfall_forecast_2hr: number | null
    rainfall_forecast_3hr: number | null
    rainfall_forecast_4hr: number | null
    accumulated_24hr: number | null
    rainfall_rate_change: number | null
    recorded_at: string | null
}

/** One point in the dam's recent water-level trend (last ~24h). */
export interface DamHistoryPoint {
    recorded_at: string
    water_level: number
    /** Metres per hour vs the previous reading (null on the first reading). */
    rate_of_change: number | null
    is_spilling: boolean
}

/** GET /api/dam/status/ — latest Pasonanca reading + thresholds + recent trend. */
export interface DamStatus {
    has_data: boolean
    dam?: string
    normal_level?: number
    critical_level?: number
    influence_radius_km?: number
    /** Dam location as [lng, lat], or null when not mapped. */
    location?: [number, number] | null
    current_level?: number
    rate_of_change?: number | null
    is_spilling?: boolean
    turbidity?: number | null
    recorded_at?: string
    /** Last ~24h of readings, oldest→newest, for the trend sparkline/chart. */
    history?: DamHistoryPoint[]
}

/** One feature from GET /api/dam/geo/ — the dam point or its river corridor. */
export interface DamGeoProperties {
    id: number
    name: string
    kind: 'dam' | 'river'
    influence_radius_km?: number
}

/** GET /api/dam/geo/ — dam point(s) + river line(s) for the map. */
export type DamGeoCollection = FeatureCollection<
    Point | MultiLineString,
    DamGeoProperties
>

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
}

export type BarangayGeometry = Polygon | MultiPolygon
export type BarangayFeatureCollection = FeatureCollection<BarangayGeometry, BarangayBaseProperties>
export type RiskFeatureCollection = FeatureCollection<BarangayGeometry, BarangayRiskProperties>
