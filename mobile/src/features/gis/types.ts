import type { FeatureCollection, Feature, Point, Polygon, MultiPolygon } from 'geojson'

/** Danger levels; most-severe-first ordering lives in constants/risk.ts. */
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

/** Flood-susceptibility level, most-severe last. */
export type SusceptibilityLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high'

/** One susceptibility zone's *computed* localized risk (rainfall × susceptibility). */
export interface ZoneScore {
    level: SusceptibilityLevel
    susceptibility: number // 0..1 static hazard-map value
    share: number // 0..1 area share of the barangay
    hazard: number // 0..1 zone hazard this cycle
    score: number // 0..100
    category: RiskCategory
}

/** GET /api/risk/barangays/:id/ — full detail for the barangay sheet. */
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
    rainfall_forecast_1hr: number | null
    rainfall_forecast_2hr: number | null
    rainfall_forecast_3hr: number | null
    rainfall_forecast_4hr: number | null
    accumulated_24hr: number | null
    rainfall_rate_change: number | null
    recorded_at: string | null
}

/** GET /api/risk/at/?lat=&lng= — pinpoint flood risk at the resident's location. */
export interface LocalizedRisk {
    barangay: { id: number; name: string }
    /** The containing barangay's headline average score. */
    average: number | null
    status: RiskCategory | null
    is_degraded: boolean | null
    computed_at: string | null
    /** The exact susceptibility zone the point falls in — null if outside any mapped zone. */
    localized: ZoneScore | null
    /** All of the barangay's zones, for context. */
    zones: ZoneScore[]
}

/** GET /api/dam/status/ — latest Pasonanca reading + thresholds. */
export interface DamStatus {
    has_data: boolean
    dam?: string
    normal_level?: number
    critical_level?: number
    current_level?: number
    rate_of_change?: number | null
    is_spilling?: boolean
    turbidity?: number | null
    recorded_at?: string
}

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
export type BarangayFeature = Feature<BarangayGeometry, BarangayBaseProperties>
export type BarangayFeatureCollection = FeatureCollection<BarangayGeometry, BarangayBaseProperties>
export type RiskFeature = Feature<BarangayGeometry, BarangayRiskProperties>
export type RiskFeatureCollection = FeatureCollection<BarangayGeometry, BarangayRiskProperties>

/** GET /api/barangays/public/ — geometry + id/name only (AllowAny, pre-auth). */
export interface PublicBarangayProperties {
    id: number
    name: string
}

export type PublicBarangayFeature = Feature<BarangayGeometry, PublicBarangayProperties>
export type PublicBarangayCollection = FeatureCollection<BarangayGeometry, PublicBarangayProperties>

/** Properties on each evacuation center from GET /api/evacuation/centers/. */
export interface EvacuationCenterProperties {
    id: number
    name: string
    capacity: number | null
    contact: string
    barangay: number | null
    barangay_name: string | null
}

export type EvacuationCenterFeature = Feature<Point, EvacuationCenterProperties>
export type EvacuationCenterCollection = FeatureCollection<Point, EvacuationCenterProperties>
