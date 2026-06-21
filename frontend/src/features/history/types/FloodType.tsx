import type { Risk } from "@/features/gis/types/RiskType";

export interface FloodType {
    date: string,
    barangay: string,
    peak_risk: Risk,
    duration: number,
    peak_rainfall: number,
    dam_level_peak: number
    view: () => void;
}