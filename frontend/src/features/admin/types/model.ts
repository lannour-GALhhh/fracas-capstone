/** Weight per pluggable risk factor. Keys must match the backend's FACTOR_KEYS. */
export interface RiskWeights {
    rainfall: number
    susceptibility: number
}

/** Lower bound (inclusive) of each category on the 0-100 composite scale. */
export interface RiskThresholds {
    medium: number
    high: number
    critical: number
}

/** How rainfall + susceptibility combine. `rainfall_gated` = no rain, no risk. */
export type CombinationMode = 'rainfall_gated' | 'weighted_sum'

/** How a barangay's per-zone scores collapse to one headline number. */
export type ZoneAggregation = 'mean' | 'max' | 'area_weighted'

/** A tunable curve: `[input, hazard]` breakpoints (x ascending, y in 0–1). */
export type Curve = [number, number][]

/** One row of GET /api/admin/risk-configs/ (mirrors RiskConfigSerializer). */
export interface RiskConfig {
    id: number
    name: string
    is_active: boolean
    combination_mode: CombinationMode
    weights: RiskWeights
    thresholds: RiskThresholds
    rainfall_curve: Curve
    accumulation_curve: Curve
    zone_aggregation: ZoneAggregation
    created_at: string
}

/** POST /api/admin/risk-configs/ payload — always created inactive. */
export interface CreateRiskConfigPayload {
    name: string
    combination_mode: CombinationMode
    weights: RiskWeights
    thresholds: RiskThresholds
    rainfall_curve: Curve
    accumulation_curve: Curve
    zone_aggregation: ZoneAggregation
}

export type UpdateRiskConfigPayload = Partial<CreateRiskConfigPayload>

export type ValidationStatus = 'pending' | 'running' | 'done' | 'failed'

/** Per-event hindcast outcome inside a ValidationRun's `details`. */
export interface ValidationDetail {
    barangay: string
    occurred_at: string
    category: string | null
    score: number | null
    hit: boolean
    error: string | null
}

/** One row of GET /api/admin/validation-runs/ (mirrors ValidationRunSerializer). */
export interface ValidationRun {
    id: number
    status: ValidationStatus
    created_at: string
    finished_at: string | null
    events_evaluated: number
    hits: number
    recall: number | null
    mean_score: number | null
    details: ValidationDetail[]
    error: string
}
