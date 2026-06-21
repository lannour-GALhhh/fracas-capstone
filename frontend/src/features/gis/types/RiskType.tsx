const Risk = {
    low: "low",
    medium: "medium",
    high: "high",
    critical: "critical"
} as const;

type Risk = typeof Risk[keyof typeof Risk]

export interface Barangay {
    name: string,
    link: string,
}

export interface RiskCardType {
    risk: Risk,
    barangays: Barangay[] | null
}