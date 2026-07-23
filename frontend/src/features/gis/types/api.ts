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
    rainfall_forecast_1hr: number | null
    rainfall_forecast_2hr: number | null
    rainfall_forecast_3hr: number | null
    rainfall_forecast_4hr: number | null
    accumulated_24hr: number | null
    rainfall_rate_change: number | null
    recorded_at: string | null
}

/** Flood-susceptibility level, most-severe last — see constants/susceptibility.ts. */
export type SusceptibilityLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high'

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

/** Properties on each feature from GET /api/barangays/hazard-zones/.
 * `category`/`score` are joined client-side from the per-zone risk snapshot. */
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
}

export type BarangayGeometry = Polygon | MultiPolygon
export type BarangayFeatureCollection = FeatureCollection<BarangayGeometry, BarangayBaseProperties>
export type RiskFeatureCollection = FeatureCollection<BarangayGeometry, BarangayRiskProperties>
