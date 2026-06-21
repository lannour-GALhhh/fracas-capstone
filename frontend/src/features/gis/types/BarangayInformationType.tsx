import type {Risk} from './RiskType'

export interface BarangayInformationType {
    name: string,
    status: Risk,
    current_rainfall: number,
    risk_score: number,

    rainfall_rate_change: number,

    rainfall_forecast_1hr: number,
    rainfall_forecast_2hr: number,
    rainfall_forecast_3hr: number,
    rainfall_forecast_4hr: number,
}